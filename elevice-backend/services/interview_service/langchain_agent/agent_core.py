"""
Enhanced Interview Agent Core Logic
==================================

This module contains the core orchestration logic for the V3.0 Interview Agent.
It transforms the service from a stateless question generator to an intelligent,
multi-turn interview agent with real-time feedback and adaptive questioning.

Key Features:
- Stateful interview management via InterviewState
- Real-time answer scoring with multiple metrics
- Adaptive question generation based on performance
- Weighted metric selection for next actions
- Comprehensive feedback generation

Architecture:
- Stateless backend design (state passed in requests)
- Modular function design for maintainability
- LLM-powered decision making with structured prompts
- Horizontal scaling compatibility
"""

import json
import logging
import random
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from shared.models import (
    InterviewState, 
    QuestionAnswerPair, 
    WeightedMetric
)
from llm_client import LLMClient

logger = logging.getLogger(__name__)

class InterviewAgent:
    """
    Core Interview Agent orchestrator.
    
    This class contains the main logic for processing interview turns,
    scoring answers, generating feedback, and adapting question strategies.
    """
    
    def __init__(self):
        self.llm_client = LLMClient()
        
        # Default weighted metrics if none provided
        self.default_metrics = [
            WeightedMetric(metric_name="technical_acumen", weight=0.35, target_threshold=75.0),
            WeightedMetric(metric_name="problem_solving", weight=0.25, target_threshold=70.0),
            WeightedMetric(metric_name="communication", weight=0.20, target_threshold=80.0),
            WeightedMetric(metric_name="experience_relevance", weight=0.20, target_threshold=70.0)
        ]
    
    def initialize_interview_state(
        self, 
        interview_type: str, 
        job_description: Optional[str] = None,
        interviewer_persona: str = "Standard Technical Interviewer",
        weighted_metrics: Optional[List[WeightedMetric]] = None,
        max_questions: int = 10,
        historical_context: Optional[List[Dict[str, Any]]] = None
    ) -> InterviewState:
        """
        Initialize a new interview state with configuration.
        
        Args:
            interview_type: Type of interview (e.g., "Software Engineer")
            job_description: Optional job context
            interviewer_persona: Interviewer personality/style
            weighted_metrics: Custom metric weights, defaults used if None
            max_questions: Maximum questions before auto-completion
            historical_context: Previous interviews for same job (if job_id present)
            
        Returns:
            Initialized InterviewState with first question
        """
        try:
            session_id = str(uuid.uuid4())
            
            # Use provided metrics or defaults
            metrics = weighted_metrics if weighted_metrics else self.default_metrics.copy()
            
            # Create initial state
            state = InterviewState(
                session_id=session_id,
                interview_type=interview_type,
                job_description=job_description,
                interviewer_persona=interviewer_persona,
                weighted_metrics=metrics,
                max_questions=max_questions,
                current_interview_stage="opening",
                historical_context=historical_context or []
            )
            
            # Generate first question
            first_question = self._generate_opening_question(state)
            state.current_question = first_question
            state.question_count = 1
            
            logger.info(f"Interview agent initialized: session {session_id[:8]}, type: {interview_type}")
            return state
            
        except Exception as e:
            logger.error(f"Error initializing interview state: {e}")
            raise
    
    def process_interview_turn(
        self, 
        state: InterviewState, 
        candidate_answer: str,
        duration_seconds: Optional[float] = None
    ) -> InterviewState:
        """
        Process a complete interview turn with scoring, feedback, and next question.
        
        This is the main orchestration function that:
        1. Scores the candidate's answer across multiple metrics
        2. Generates real-time feedback
        3. Updates conversation history
        4. Selects next action based on weighted metrics
        5. Generates next question or ends interview
        
        Args:
            state: Current interview state
            candidate_answer: Candidate's response to current question
            duration_seconds: Optional response duration for WPM calculation
            
        Returns:
            Updated InterviewState with new question and feedback
        """
        try:
            logger.info(f"Processing turn for session {state.session_id[:8]}, question {state.question_count}")
            
            # Step 1: Score the candidate's answer
            scored_qa_pair = self._score_answer(state, candidate_answer, duration_seconds)
            
            # Step 2: Update conversation history
            state.conversation_history.append(scored_qa_pair)
            
            # Step 3: Generate real-time feedback
            state.real_time_feedback = self._generate_real_time_feedback(state, scored_qa_pair)
            
            # Step 4: Update metrics and check for completion
            self._update_weighted_metrics(state)
            self._update_overall_performance(state)
            
            # Step 5: Check if interview should end
            if self._should_end_interview(state):
                state.interview_complete = True
                state.completion_reason = self._determine_completion_reason(state)
                state.overall_performance_summary = self._generate_final_summary(state)
                logger.info(f"Interview completed: {state.completion_reason}")
                return state
            
            # Step 6: Select next action based on performance
            state.next_action = self._select_next_action(state)
            
            # Step 7: Generate next question
            next_question = self._generate_adaptive_question(state)
            state.current_question = next_question
            state.question_count += 1
            
            # Step 8: Update interview stage if needed
            self._update_interview_stage(state)
            
            logger.info(f"Turn processed successfully, next action: {state.next_action}")
            return state
            
        except Exception as e:
            logger.error(f"Error processing interview turn: {e}")
            raise
    
    def _score_answer(
        self, 
        state: InterviewState, 
        answer: str, 
        duration_seconds: Optional[float] = None
    ) -> QuestionAnswerPair:
        """
        Enhanced answer scorer with granular justifications (LangGraph-style answer_scorer node).
        
        This implements the refined plan's answer_scorer node that:
        1. Scores across all metrics with detailed justifications
        2. Updates granular_scores and flat_scores for weakness tracking
        3. Returns structured scoring data for probabilistic selection
        
        Args:
            state: Current interview state for context
            answer: Candidate's response
            duration_seconds: Optional duration for WPM calculation
            
        Returns:
            QuestionAnswerPair with enhanced scoring data
        """
        try:
            # Build enhanced scoring prompt
            prompt = self._build_enhanced_scoring_prompt(state, answer, duration_seconds)
            
            # Get LLM response with structured scoring
            response = self.llm_client.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            # Parse response
            scoring_data = json.loads(response.text)
            
            # Update granular scores in state (KEY ENHANCEMENT)
            self._update_granular_scores(state, scoring_data)
            
            # Update flat scores for weakness identification (KEY ENHANCEMENT)
            self._update_flat_scores(state, scoring_data)
            
            # Track metric improvement history
            self._track_metric_improvements(state, scoring_data)
            
            # Create scored Q&A pair
            qa_pair = QuestionAnswerPair(
                question=state.current_question,
                answer=answer,
                timestamp=datetime.now().isoformat(),
                score=scoring_data.get("overall_score", 50),
                metrics=scoring_data.get("metrics", {}),
                feedback=scoring_data.get("turn_feedback", "")
            )
            
            logger.info(f"Enhanced scoring complete: {qa_pair.score}/100, flat_scores: {state.flat_scores}")
            return qa_pair
            
        except Exception as e:
            logger.error(f"Error in enhanced answer scoring: {e}")
            # Fallback scoring
            return self._fallback_scoring(state, answer)
    
    def _build_enhanced_scoring_prompt(
        self, 
        state: InterviewState, 
        answer: str, 
        duration_seconds: Optional[float] = None
    ) -> str:
        """Build enhanced prompt for granular scoring with justifications."""
        
        # Calculate WPM if duration provided
        wpm_context = ""
        if duration_seconds:
            word_count = len(answer.split())
            wpm = (word_count / duration_seconds) * 60
            wpm_context = f"\nSpeaking Rate: {wpm:.1f} words per minute"
        
        # Build conversation context
        conversation_context = ""
        if state.conversation_history:
            recent_history = state.conversation_history[-2:]
            conversation_context = "\n\nRECENT CONVERSATION HISTORY:\n"
            for i, qa in enumerate(recent_history, 1):
                conversation_context += f"Q{i}: {qa.question}\nA{i}: {qa.answer}\nScore: {qa.score}\n"
        
        # Build metrics context
        metrics_list = [metric.metric_name for metric in state.weighted_metrics]
        
        prompt = f"""
You are an expert interview evaluator conducting structured assessment for a {state.interview_type} position.

RUBRIC CONTEXT:
{state.job_description or "Standard technical position requiring strong technical and communication skills"}

INTERVIEWER PERSONA: {state.interviewer_persona}
CURRENT QUESTION: {state.current_question}
CANDIDATE ANSWER: {answer}{wpm_context}
{conversation_context}

EVALUATION TASK:
Score the candidate's answer across ALL specified metrics with detailed justifications. 
Use a 1-5 scale where:
- 1: Poor/Inadequate
- 2: Below Average  
- 3: Average/Acceptable
- 4: Good/Strong
- 5: Excellent/Outstanding

METRICS TO EVALUATE: {metrics_list}

Return a JSON response with this EXACT structure:
{{
    "overall_score": <integer 0-100>,
    "metrics": {{
        "{metrics_list[0] if metrics_list else 'technical_acumen'}": <float 1-5>,
        "{metrics_list[1] if len(metrics_list) > 1 else 'communication'}": <float 1-5>,
        "{metrics_list[2] if len(metrics_list) > 2 else 'problem_solving'}": <float 1-5>,
        "{metrics_list[3] if len(metrics_list) > 3 else 'experience_relevance'}": <float 1-5>
    }},
    "granular_justifications": {{
        "{metrics_list[0] if metrics_list else 'technical_acumen'}": {{
            "score": <float 1-5>,
            "justification": "Specific reasoning for this score...",
            "strengths": ["strength1", "strength2"],
            "areas_for_improvement": ["improvement1", "improvement2"]
        }},
        "{metrics_list[1] if len(metrics_list) > 1 else 'communication'}": {{
            "score": <float 1-5>,
            "justification": "Specific reasoning for this score...",
            "strengths": ["strength1", "strength2"],
            "areas_for_improvement": ["improvement1", "improvement2"]
        }}
    }},
    "turn_feedback": "Constructive feedback acknowledging strengths and suggesting improvements...",
    "recommended_follow_up_areas": ["area1", "area2"]
}}

Ensure all metrics in the list are evaluated with detailed justifications.
"""
        return prompt
    
    def _update_granular_scores(self, state: InterviewState, scoring_data: Dict) -> None:
        """Update granular scores with detailed justifications."""
        granular_justifications = scoring_data.get("granular_justifications", {})
        for metric_name, justification_data in granular_justifications.items():
            state.granular_scores[metric_name] = {
                "score": justification_data.get("score", 3.0),
                "justification": justification_data.get("justification", ""),
                "strengths": justification_data.get("strengths", []),
                "areas_for_improvement": justification_data.get("areas_for_improvement", []),
                "timestamp": datetime.now().isoformat()
            }
    
    def _update_flat_scores(self, state: InterviewState, scoring_data: Dict) -> None:
        """Update flat scores for easy weakness identification (KEY for weighted selection)."""
        metrics = scoring_data.get("metrics", {})
        for metric_name, score in metrics.items():
            # Convert 1-5 scale to 0-100 scale for flat scores
            normalized_score = ((score - 1) / 4) * 100  # 1->0, 3->50, 5->100
            state.flat_scores[metric_name] = normalized_score
    
    def _track_metric_improvements(self, state: InterviewState, scoring_data: Dict) -> None:
        """Track score changes over time for improvement analysis."""
        metrics = scoring_data.get("metrics", {})
        for metric_name, score in metrics.items():
            if metric_name not in state.metric_improvement_history:
                state.metric_improvement_history[metric_name] = []
            
            # Convert to 0-100 scale and track
            normalized_score = ((score - 1) / 4) * 100
            state.metric_improvement_history[metric_name].append(normalized_score)
    
    def _fallback_scoring(self, state: InterviewState, answer: str) -> QuestionAnswerPair:
        """Fallback scoring when main scoring fails."""
        fallback_metrics = {metric.metric_name: 50.0 for metric in state.weighted_metrics}
        
        # Update flat scores with fallback values
        state.flat_scores.update(fallback_metrics)
        
        return QuestionAnswerPair(
            question=state.current_question,
            answer=answer,
            timestamp=datetime.now().isoformat(),
            score=50,  # Neutral score
            metrics=fallback_metrics,
            feedback="Unable to generate detailed feedback due to scoring error."
        )
    
    def _build_scoring_prompt(
        self, 
        state: InterviewState, 
        answer: str, 
        duration_seconds: Optional[float] = None
    ) -> str:
        """Build structured prompt for answer scoring."""
        
        # Calculate WPM if duration provided
        wpm_context = ""
        if duration_seconds:
            word_count = len(answer.split())
            wpm = (word_count / duration_seconds) * 60
            wpm_context = f"\nSpeaking Rate: {wpm:.1f} words per minute"
        
        # Build conversation context
        conversation_context = ""
        if state.conversation_history:
            recent_history = state.conversation_history[-2:]  # Last 2 exchanges for context
            conversation_context = "\n\nRECENT CONVERSATION HISTORY:\n"
            for i, qa in enumerate(recent_history, 1):
                conversation_context += f"Q{i}: {qa.question}\nA{i}: {qa.answer}\n"
        
        # Build metrics context
        metrics_context = "\n\nMETRICS TO EVALUATE:\n"
        for metric in state.weighted_metrics:
            metrics_context += f"- {metric.metric_name} (weight: {metric.weight}, target: {metric.target_threshold}%)\n"
        
        prompt = f"""
You are {state.interviewer_persona} conducting a {state.interview_type} interview.

JOB CONTEXT:
{state.job_description or "Standard technical interview"}

CURRENT QUESTION:
{state.current_question}

CANDIDATE'S ANSWER:
{answer}{wpm_context}
{conversation_context}
{metrics_context}

Score this answer on a 0-100 scale for each metric and provide an overall score.
Consider the interviewer persona, job requirements, and conversation context.

SCORING GUIDELINES:
- technical_acumen: Depth of technical knowledge, accuracy, best practices
- problem_solving: Logical thinking, approach to challenges, creativity
- communication: Clarity, structure, professional presentation
- experience_relevance: Real-world examples, applicable experience

Return JSON in this exact format:
{{
    "overall_score": 75,
    "metrics": {{
        "technical_acumen": 80.0,
        "problem_solving": 70.0,
        "communication": 85.0,
        "experience_relevance": 65.0
    }},
    "turn_feedback": "Brief constructive feedback on this specific answer",
    "strengths": ["Strong technical depth", "Clear communication"],
    "areas_for_improvement": ["Could provide more specific examples"]
}}
"""
        return prompt
    
    def _generate_real_time_feedback(
        self, 
        state: InterviewState, 
        qa_pair: QuestionAnswerPair
    ) -> str:
        """
        Generate constructive real-time feedback for the candidate.
        
        This function reads the granular_scores and justification for the most recent answer
        and synthesizes a friendly, constructive message using an LLM prompt.
        
        The feedback helps the candidate understand why the agent is asking specific follow-up
        questions and provides immediate, actionable guidance for improvement.
        """
        try:
            # Get the most recent granular scores and justifications
            granular_feedback = {}
            for metric_name, data in state.granular_scores.items():
                granular_feedback[metric_name] = {
                    "score": data.get("score", 3.0),
                    "justification": data.get("justification", ""),
                    "strengths": data.get("strengths", []),
                    "areas_for_improvement": data.get("areas_for_improvement", [])
                }
            
            feedback_json = json.dumps(granular_feedback, indent=2)
            
            prompt = f"""
You are a helpful interview coach. Based on the following feedback, write a single sentence to help the candidate improve their next answer.

The feedback is:
{feedback_json}

INTERVIEW CONTEXT:
- Interviewer Persona: {state.interviewer_persona}
- Interview Type: {state.interview_type}
- Question: {qa_pair.question}
- Answer: {qa_pair.answer}
- Overall Score: {qa_pair.score}/100

Generate encouraging, specific feedback that:
1. Acknowledges what they did well
2. Provides one actionable improvement for their next response
3. Explains why this improvement will help them succeed

Example format: "That's a good example of your skills, but try to add some specific numbers to quantify your impact."

Keep it friendly, constructive, and focused on one key improvement.
"""
            
            response = self.llm_client.model.generate_content(prompt)
            feedback_text = response.text.strip()
            
            # Store the feedback in a structured format
            return {
                "summary": feedback_text,
                "granular_details": granular_feedback,
                "coaching_focus": self._identify_coaching_focus(state)
            }
            
        except Exception as e:
            logger.error(f"Error generating real-time feedback: {e}")
            return {
                "summary": "Thank you for your response. Please continue with the next question.",
                "granular_details": {},
                "coaching_focus": "general"
            }
    
    def _identify_coaching_focus(self, state: InterviewState) -> str:
        """
        Identify the primary area where the candidate needs coaching based on performance.
        """
        try:
            if not state.flat_scores:
                return "general"
            
            # Find the metric with the lowest score
            lowest_metric = min(state.flat_scores.items(), key=lambda x: x[1])
            return lowest_metric[0]
            
        except Exception as e:
            logger.error(f"Error identifying coaching focus: {e}")
            return "general"
    
    def _get_persona_specific_instructions(self, persona: str) -> str:
        """
        Get specific instructions based on the interviewer persona.
        
        This enables realistic role-playing with different interviewer types:
        - Skeptical senior engineer
        - Friendly but formal HR manager  
        - Laid-back founder
        - etc.
        """
        persona_instructions = {
            "Skeptical Senior Engineer": """
PERSONA STYLE: You are a skeptical senior engineer who values depth and technical precision.
- Ask concise, direct questions that probe for technical depth
- Challenge assumptions and look for edge cases
- Focus on implementation details and real-world experience
- Be direct but professional, with high technical standards
- Example tone: "That's interesting, but how would you handle..."
            """,
            
            "Friendly HR Manager": """
PERSONA STYLE: You are a friendly but formal HR manager focused on fit and soft skills.
- Ask behavioral questions with warmth but maintain professionalism
- Focus on communication, teamwork, and cultural fit
- Use encouraging language while maintaining structure
- Probe for specific examples and outcomes
- Example tone: "I'd love to hear more about how you..."
            """,
            
            "Laid-back Founder": """
PERSONA STYLE: You are a relaxed startup founder who values practical problem-solving.
- Ask questions in a conversational, casual tone
- Focus on real-world impact and practical solutions
- Value creativity and adaptability over rigid processes
- Be encouraging and show genuine interest
- Example tone: "Cool! So how did you figure out..."
            """,
            
            "Technical Lead": """
PERSONA STYLE: You are an experienced technical lead balancing depth with leadership.
- Ask questions that reveal both technical skills and team dynamics
- Focus on architecture, scaling, and team collaboration
- Balance technical depth with practical considerations
- Show interest in mentoring and growth mindset
- Example tone: "Let's dive deeper into how you would..."
            """,
            
            "Standard Technical Interviewer": """
PERSONA STYLE: You are a professional, balanced technical interviewer.
- Ask clear, well-structured questions covering multiple areas
- Maintain professional but approachable tone
- Balance technical depth with practical application
- Focus on comprehensive skill assessment
- Example tone: "Can you walk me through your approach to..."
            """
        }
        
        return persona_instructions.get(persona, persona_instructions["Standard Technical Interviewer"])
    
    def _select_next_action(self, state: InterviewState) -> str:
        """
        Enhanced weighted metric selector with probabilistic weakness targeting.
        
        This implements the refined plan's weighted_metric_selector node that:
        1. Analyzes flat_scores for weakness identification
        2. Uses weighted random selection based on performance gaps
        3. Intelligently balances addressing weaknesses vs comprehensive coverage
        4. Tracks how many times each weakness has been addressed
        
        Returns the next action/strategy for question generation.
        """
        try:
            # Step 1: Update current target metric using weighted selection
            selected_metric = self._weighted_metric_selection(state)
            state.current_target_metric = selected_metric
            
            # Step 2: Determine action strategy based on selected metric and context
            action_strategy = self._determine_action_strategy(state, selected_metric)
            
            logger.info(
                f"Weighted selection: target_metric='{selected_metric}', "
                f"action='{action_strategy}', flat_scores={state.flat_scores}"
            )
            return action_strategy
            
        except Exception as e:
            logger.error(f"Error in weighted metric selection: {e}")
            return "continue_standard_flow"
    
    def _weighted_metric_selection(self, state: InterviewState) -> str:
        """
        Core weighted metric selector - the heart of the refined plan.
        
        Uses probabilistic selection where weaker metrics have higher probability
        of being selected, but stronger metrics can still be revisited occasionally.
        """
        if not state.flat_scores:
            # First turn - return first metric
            return state.weighted_metrics[0].metric_name if state.weighted_metrics else "technical_acumen"
        
        # Calculate selection weights based on inverse performance
        metric_weights = []
        metric_names = []
        
        for metric in state.weighted_metrics:
            metric_name = metric.metric_name
            current_score = state.flat_scores.get(metric_name, 50.0)  # Default to 50 if not scored yet
            
            # Calculate weight based on inverse performance (lower scores = higher weights)
            # Score ranges: 0-100, Weight calculation:
            if current_score <= 20:    # Very poor (1 on 1-5 scale)
                weight = 10.0  # Very high chance
            elif current_score <= 40:  # Poor (2 on 1-5 scale)  
                weight = 5.0   # High chance
            elif current_score <= 60:  # Average (3 on 1-5 scale)
                weight = 2.0   # Moderate chance
            elif current_score <= 80:  # Good (4 on 1-5 scale)
                weight = 0.5   # Low chance
            else:                     # Excellent (5 on 1-5 scale)
                weight = 0.1   # Very low chance
            
            # Additional weight reduction if we've addressed this metric many times
            times_addressed = state.weakness_tracking.get(metric_name, 0)
            if times_addressed > 2:
                weight *= 0.3  # Reduce weight significantly after 2+ attempts
            
            metric_weights.append(weight)
            metric_names.append(metric_name)
        
        # Weighted random selection
        if metric_names and metric_weights:
            selected_metric = random.choices(metric_names, weights=metric_weights)[0]
            
            # Track that we're addressing this metric
            state.weakness_tracking[selected_metric] = state.weakness_tracking.get(selected_metric, 0) + 1
            
            return selected_metric
        
        # Fallback
        return state.weighted_metrics[0].metric_name if state.weighted_metrics else "technical_acumen"
    
    def _determine_action_strategy(self, state: InterviewState, target_metric: str) -> str:
        """
        Determine the specific action strategy based on the selected metric and interview context.
        
        Maps target metrics to appropriate question strategies.
        """
        # Base action mapping by metric
        metric_action_map = {
            "technical_acumen": "ask_technical_deep_dive",
            "problem_solving": "ask_problem_solving", 
            "communication": "ask_behavioral_question",
            "experience_relevance": "ask_behavioral_question",
            "system_design": "ask_system_design",
            "coding_skills": "ask_technical_deep_dive",
            "leadership": "ask_behavioral_question"
        }
        
        base_action = metric_action_map.get(target_metric, "continue_standard_flow")
        
        # Contextual adjustments
        if "senior" in state.interview_type.lower() and target_metric == "technical_acumen":
            base_action = "ask_system_design"
        elif state.question_count >= state.max_questions - 2:
            base_action = "ask_closing_question" 
        elif state.current_interview_stage == "opening" and state.question_count <= 2:
            base_action = "continue_standard_flow"  # Don't dive too deep immediately
        
        return base_action
    
    def _generate_adaptive_question(self, state: InterviewState) -> str:
        """
        Enhanced adaptive question generator that targets the selected metric.
        
        This implements the refined plan's adaptive_question_generator node that:
        1. Uses the current_target_metric from weighted selection
        2. Generates questions specifically tailored to address that metric
        3. Incorporates granular score justifications for context
        4. Maintains natural conversation flow
        """
        try:
            # Build enhanced context with target metric focus
            conversation_context = self._build_conversation_context_for_question(state)
            performance_context = self._build_enhanced_performance_context(state)
            target_metric_context = self._build_target_metric_context(state)
            
            prompt = f"""
You are {state.interviewer_persona} conducting a {state.interview_type} interview.

{self._get_persona_specific_instructions(state.interviewer_persona)}

JOB DESCRIPTION:
{state.job_description or "Standard technical position"}

CONVERSATION HISTORY:
{conversation_context}

PERFORMANCE ANALYSIS:
{performance_context}

TARGET METRIC FOCUS: {state.current_target_metric}
{target_metric_context}

NEXT ACTION STRATEGY: {state.next_action}
INTERVIEW STAGE: {state.current_interview_stage}
QUESTION COUNT: {state.question_count}/{state.max_questions}

QUESTION GENERATION TASK:
Generate a question that specifically targets the "{state.current_target_metric}" metric while following the "{state.next_action}" strategy. The candidate's last answer was: {state.conversation_history[-1].answer if state.conversation_history else 'N/A'}. The weakness you need to probe is {state.current_target_metric}.

Use this context to craft your question:
{target_metric_context}

QUESTION GENERATION RULES:
1. **PRIMARY FOCUS**: Target the {state.current_target_metric} metric specifically
2. **STRATEGY**: Follow {state.next_action} approach
3. **NATURAL FLOW**: Build on previous conversation naturally
4. **SPECIFIC TARGETING**: Address weaknesses identified in {state.current_target_metric}
5. **DEPTH APPROPRIATE**: Match question complexity to candidate level
6. **PERSONA ALIGNMENT**: Follow the specific style guidelines for {state.interviewer_persona}

ACTION-SPECIFIC GUIDELINES:
- ask_technical_deep_dive: Deep technical exploration of {state.current_target_metric}
- ask_behavioral_question: Behavioral examples demonstrating {state.current_target_metric}
- ask_problem_solving: Practical problems that reveal {state.current_target_metric}
- ask_system_design: Architectural thinking showcasing {state.current_target_metric}
- continue_standard_flow: Balanced question with {state.current_target_metric} focus

Return only the question text, no additional formatting.
"""
            
            response = self.llm_client.model.generate_content(prompt)
            question = self._clean_response_text(response.text.strip())
            
            logger.info(
                f"Generated targeted question: action='{state.next_action}', "
                f"target_metric='{state.current_target_metric}'"
            )
            return question
            
        except Exception as e:
            logger.error(f"Error generating targeted adaptive question: {e}")
            return f"Can you tell me more about your experience with {state.interview_type} technologies?"
    
    def _build_target_metric_context(self, state: InterviewState) -> str:
        """Build detailed context for the target metric to guide question generation."""
        if not state.current_target_metric:
            return "No specific metric target selected."
        
        metric_name = state.current_target_metric
        
        # Get current performance data
        current_score = state.flat_scores.get(metric_name, "Not yet scored")
        granular_data = state.granular_scores.get(metric_name, {})
        times_addressed = state.weakness_tracking.get(metric_name, 0)
        
        context = f"""
METRIC: {metric_name}
CURRENT SCORE: {current_score}/100
TIMES ADDRESSED: {times_addressed}
"""
        
        # Add granular justification context if available
        if granular_data:
            context += f"""
PREVIOUS JUSTIFICATION: {granular_data.get('justification', 'None')}
IDENTIFIED STRENGTHS: {granular_data.get('strengths', [])}
AREAS FOR IMPROVEMENT: {granular_data.get('areas_for_improvement', [])}
"""
        
        # Add improvement tracking context
        if metric_name in state.metric_improvement_history:
            history = state.metric_improvement_history[metric_name]
            if len(history) > 1:
                trend = "improving" if history[-1] > history[-2] else "declining"
                context += f"\nSCORE TREND: {trend} (from {history[-2]:.1f} to {history[-1]:.1f})"
        
        return context
    
    def _build_enhanced_performance_context(self, state: InterviewState) -> str:
        """Build enhanced performance context with flat scores and trends."""
        if not state.flat_scores:
            return "No performance data available yet."
        
        context = "PERFORMANCE SUMMARY:\n"
        for metric_name, score in state.flat_scores.items():
            status = "WEAK" if score < 50 else "AVERAGE" if score < 75 else "STRONG"
            context += f"- {metric_name}: {score:.1f}/100 ({status})\n"
        
        # Add weakness prioritization
        weak_metrics = [name for name, score in state.flat_scores.items() if score < 60]
        if weak_metrics:
            context += f"\nWEAKNESS PRIORITIES: {', '.join(weak_metrics)}"
        
        return context
    
    def _generate_opening_question(self, state: InterviewState) -> str:
        """Generate contextual opening question for new interview."""
        try:
            # Build historical context section if available
            historical_context_section = ""
            if state.historical_context:
                historical_context_section = f"""
HISTORICAL CONTEXT:
We have conducted {len(state.historical_context)} previous interviews for this {state.interview_type} position.
Use this context to ask probing questions that differentiate this candidate.
"""
            
            prompt = f"""
You are {state.interviewer_persona} starting a {state.interview_type} interview.

{self._get_persona_specific_instructions(state.interviewer_persona)}

JOB DESCRIPTION:
{state.job_description or "We are looking for a skilled professional"}

{historical_context_section}

Generate a warm, professional opening question that:
1. Sets a welcoming tone that matches your persona
2. Allows the candidate to introduce themselves
3. Is specific to the {state.interview_type} role
4. Encourages a detailed response about relevant background
5. Reflects your interviewer style and approach
{"6. Can help differentiate this candidate from previous ones" if state.historical_context else ""}

Return only the question text.
"""
            
            response = self.llm_client.model.generate_content(prompt)
            question = self._clean_response_text(response.text.strip())
            return question
            
        except Exception as e:
            logger.error(f"Error generating opening question: {e}")
            return f"Tell me about yourself and your experience relevant to this {state.interview_type} position."
    
    def _clean_response_text(self, text: str) -> str:
        """Clean response text by removing surrounding quotes and extra whitespace."""
        if not text:
            return text
            
        # Remove surrounding quotes (both single and double)
        text = text.strip()
        if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
            text = text[1:-1]
        
        # Clean up any remaining whitespace
        return text.strip()
    
    # Helper methods for state management
    
    def _update_weighted_metrics(self, state: InterviewState) -> None:
        """Update running averages for weighted metrics."""
        if not state.conversation_history:
            return
        
        for metric in state.weighted_metrics:
            scores = []
            for qa in state.conversation_history:
                if qa.metrics and metric.metric_name in qa.metrics:
                    scores.append(qa.metrics[metric.metric_name])
            
            if scores:
                metric.current_score = sum(scores) / len(scores)
    
    def _update_overall_performance(self, state: InterviewState) -> None:
        """Update overall performance average."""
        if state.conversation_history:
            scores = [qa.score for qa in state.conversation_history if qa.score is not None]
            if scores:
                state.average_score = sum(scores) / len(scores)
    
    def _should_end_interview(self, state: InterviewState) -> bool:
        """
        Enhanced interview completion checker (LangGraph-style end_interview_checker node).
        
        Implements the refined plan's sophisticated completion logic:
        1. Rubric Saturation Check: All metrics at acceptable thresholds
        2. Max Turns Check: Exceeded predefined limit
        3. No Improvement Check: Multiple attempts with no score improvement
        4. Early termination for very poor performance
        """
        # Max questions reached
        if state.question_count >= state.max_questions:
            return True
        
        # Rubric Saturation Check - all metrics at threshold (75+ on 0-100 scale)
        if state.flat_scores and len(state.flat_scores) >= len(state.weighted_metrics):
            rubric_satisfied = all(
                score >= 75.0 for score in state.flat_scores.values()
            )
            if rubric_satisfied and state.question_count >= 4:  # Minimum questions for comprehensive assessment
                return True
        
        # No Improvement Check - metric stuck after multiple attempts
        if self._check_metric_stagnation(state):
            return True
        
        # Early termination for very poor performance (multiple metrics below 30)
        if state.flat_scores and state.question_count >= 4:
            poor_metrics = sum(1 for score in state.flat_scores.values() if score < 30)
            if poor_metrics >= len(state.flat_scores) * 0.6:  # 60% of metrics are poor
                return True
        
        return False
    
    def _check_metric_stagnation(self, state: InterviewState) -> bool:
        """
        Check if metrics are showing no improvement after multiple attempts.
        
        This implements the "No Improvement Check" from the refined plan.
        """
        if not state.metric_improvement_history:
            return False
        
        stagnant_metrics = 0
        total_metrics = len(state.weighted_metrics)
        
        for metric_name, history in state.metric_improvement_history.items():
            if len(history) >= 3:  # Need at least 3 data points
                # Check if last 3 scores show no significant improvement (< 5 point change)
                recent_scores = history[-3:]
                if max(recent_scores) - min(recent_scores) < 5:
                    # Also check if we've addressed this metric multiple times
                    times_addressed = state.weakness_tracking.get(metric_name, 0)
                    if times_addressed >= 3:
                        stagnant_metrics += 1
        
        # End if majority of metrics are stagnant
        return stagnant_metrics >= total_metrics * 0.5
    
    def _determine_completion_reason(self, state: InterviewState) -> str:
        """Enhanced completion reason determination with detailed analysis."""
        if state.question_count >= state.max_questions:
            return "Maximum questions reached"
        
        # Check rubric saturation
        if state.flat_scores and len(state.flat_scores) >= len(state.weighted_metrics):
            if all(score >= 75.0 for score in state.flat_scores.values()):
                return "All performance targets achieved - comprehensive skill demonstration"
        
        # Check stagnation
        if self._check_metric_stagnation(state):
            return "Multiple metrics showing no improvement after repeated targeting"
        
        # Check poor performance
        if state.flat_scores:
            poor_metrics = sum(1 for score in state.flat_scores.values() if score < 30)
            if poor_metrics >= len(state.flat_scores) * 0.6:
                return "Performance threshold not met across multiple competencies"
        
        return "Interview completed"
    
    def _generate_final_summary(self, state: InterviewState) -> str:
        """Generate comprehensive final performance summary."""
        try:
            conversation_summary = "\n".join([
                f"Q: {qa.question}\nA: {qa.answer}\nScore: {qa.score}/100\n"
                for qa in state.conversation_history[-3:]  # Last 3 exchanges
            ])
            
            prompt = f"""
Generate a comprehensive interview summary for this {state.interview_type} candidate.

INTERVIEW OVERVIEW:
- Questions Asked: {state.question_count}
- Average Score: {state.average_score:.1f}/100
- Completion Reason: {state.completion_reason}

RECENT CONVERSATION:
{conversation_summary}

METRIC PERFORMANCE:
{chr(10).join([f"- {m.metric_name}: {m.current_score:.1f}/100 (target: {m.target_threshold})" 
               for m in state.weighted_metrics if m.current_score])}

Provide a professional summary (3-4 sentences) covering:
1. Overall performance assessment
2. Key strengths demonstrated
3. Areas for development
4. Recommendation for next steps
"""
            
            response = self.llm_client.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating final summary: {e}")
            return f"Interview completed with {state.question_count} questions. Average performance: {state.average_score:.1f}/100."
    
    def _build_conversation_context_for_question(self, state: InterviewState) -> str:
        """Build formatted conversation context for question generation."""
        if not state.conversation_history:
            return "No previous conversation."
        
        context_parts = []
        for i, qa in enumerate(state.conversation_history, 1):
            context_parts.append(f"Q{i}: {qa.question}")
            context_parts.append(f"A{i}: {qa.answer}")
            context_parts.append(f"Score: {qa.score}/100")
            context_parts.append("")
        
        return "\n".join(context_parts)
    
    def _build_performance_context(self, state: InterviewState) -> str:
        """Build performance analysis context."""
        context_parts = [f"Overall Average: {state.average_score:.1f}/100" if state.average_score else "No scores yet"]
        
        for metric in state.weighted_metrics:
            if metric.current_score is not None:
                status = "✓" if metric.current_score >= (metric.target_threshold or 70) else "⚠"
                context_parts.append(f"{status} {metric.metric_name}: {metric.current_score:.1f}/100")
        
        return "\n".join(context_parts)
    
    def _update_interview_stage(self, state: InterviewState) -> None:
        """Update interview stage based on progress."""
        if state.question_count <= 2:
            state.current_interview_stage = "opening"
        elif state.question_count <= 6:
            state.current_interview_stage = "technical"
        elif state.question_count <= 8:
            state.current_interview_stage = "behavioral"
        else:
            state.current_interview_stage = "closing"
