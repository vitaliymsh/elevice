"""
LangGraph Nodes for Interview Agent
===================================

This module contains all the individual nodes used in the LangGraph interview workflow.
Each node represents a specific step in the interview process and operates on the shared state.
"""

import json
import logging
import random
from typing import Dict, Any, List
from datetime import datetime

try:
    from langchain_core.messages import HumanMessage, AIMessage
    from langchain_google_genai import ChatGoogleGenerativeAI
    LANGCHAIN_AVAILABLE = True
except ImportError:
    # Fallback for when LangChain is not available
    LANGCHAIN_AVAILABLE = False
    import google.generativeai as genai

from .langgraph_state import (
    InterviewState, ActionType, InterviewStage, WeightedMetric,
    QuestionAnswerPair, GranularScore, RealtimeFeedback
)
from .langchain_prompts import InterviewPromptTemplates

logger = logging.getLogger(__name__)

class InterviewNodes:
    """
    Collection of LangGraph nodes for the interview agent workflow.
    
    Each method is a node that:
    1. Receives the current state
    2. Performs a specific operation
    3. Returns the updated state
    """
    
    def __init__(self, google_api_key: str, model_name: str = "gemini-1.5-pro"):
        """Initialize with LangChain LLM or fallback to direct Google AI."""
        self.google_api_key = google_api_key
        
        if LANGCHAIN_AVAILABLE:
            self.llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=google_api_key,
                temperature=0.7,
                max_output_tokens=2048
            )
            self.use_langchain = True
        else:
            # Fallback to direct Google AI
            genai.configure(api_key=google_api_key)
            self.llm = genai.GenerativeModel(model_name)
            self.use_langchain = False
            
        self.templates = InterviewPromptTemplates()
    
    def _invoke_llm(self, prompt: str) -> str:
        """Invoke LLM with proper handling for LangChain or direct API."""
        if self.use_langchain:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            return response.content
        else:
            response = self.llm.generate_content(prompt)
            return response.text
    
    # ============================================================================
    # INITIALIZATION NODES
    # ============================================================================
    
    def initialize_interview(self, state: InterviewState) -> InterviewState:
        """
        Initialize interview with opening question.
        
        Node: initialize_interview
        Purpose: Generate the first question and set up initial state
        """
        try:
            logger.info(f"Initializing interview: {state['interview_type']}")
            
            # Generate opening question
            prompt = self.templates.OPENING_QUESTION_PROMPT.format(
                interviewer_persona=state['interviewer_persona'],
                interview_type=state['interview_type'],
                job_description=state.get('job_description', 'No specific job description provided'),
                persona_instructions=self.templates.get_persona_instructions(state['interviewer_persona'])
            )
            
            response = self._invoke_llm(prompt)
            opening_question = response.strip()
            
            # Update state
            state['current_question'] = opening_question
            state['question_count'] = 1
            state['current_interview_stage'] = InterviewStage.OPENING
            state['current_target_metric'] = state['weighted_metrics'][0].metric_name if state['weighted_metrics'] else 'technical_acumen'
            state['next_action'] = ActionType.CONTINUE_STANDARD
            
            logger.info(f"Interview initialized with opening question: {opening_question[:100]}...")
            return state
            
        except Exception as e:
            logger.error(f"Error initializing interview: {e}")
            # Fallback to a basic question if LLM fails
            opening_question = f"Hello! I'm excited to interview you for the {state['interview_type']} position. Could you start by telling me about yourself and your experience with {state['interview_type']} technologies?"
            
            state['current_question'] = opening_question
            state['question_count'] = 1
            state['current_interview_stage'] = InterviewStage.OPENING
            state['current_target_metric'] = state['weighted_metrics'][0].metric_name if state['weighted_metrics'] else 'technical_acumen'
            state['next_action'] = ActionType.CONTINUE_STANDARD
            state['error'] = str(e)
            return state
    
    # ============================================================================
    # SCORING NODES
    # ============================================================================
    
    def score_answer(self, state: InterviewState) -> InterviewState:
        """
        Score candidate's answer across all metrics.
        
        Node: score_answer
        Purpose: Evaluate the last answer and update performance metrics
        """
        try:
            if not state.get('conversation_history'):
                logger.warning("No conversation history to score")
                return state
            
            last_qa = state['conversation_history'][-1]
            logger.info(f"Scoring answer for question {state['question_count']}")
            
            # Build enhanced scoring prompt
            metrics_list = [m.metric_name for m in state['weighted_metrics']]
            conversation_context = self.templates.format_conversation_context(
                state['conversation_history'][:-1]  # Exclude current answer
            )
            
            # Create dynamic JSON templates
            metrics_json_template = self.templates.create_metrics_json_template(metrics_list)
            granular_json_template = self.templates.create_granular_json_template(metrics_list)
            
            prompt = self.templates.ENHANCED_SCORING_PROMPT.format(
                interview_type=state['interview_type'],
                job_description=state.get('job_description', 'No specific job description provided'),
                interviewer_persona=state['interviewer_persona'],
                current_question=last_qa.question,
                answer=last_qa.answer,
                metrics_list=', '.join(metrics_list),
                wmp_context=self.templates.build_wpm_context(
                    last_qa.duration_seconds, last_qa.answer
                ),
                conversation_context=conversation_context,
                metrics_json_template=metrics_json_template,
                granular_json_template=granular_json_template
            )
            
            # Get structured response
            response = self._invoke_llm(prompt)
            
            try:
                scoring_data = json.loads(response)
            except json.JSONDecodeError:
                logger.error("Failed to parse scoring JSON, using fallback")
                scoring_data = self._create_fallback_scoring(metrics_list)
            
            # Update the last Q&A with scoring
            last_qa.score = scoring_data.get('overall_score', 50)
            last_qa.metrics = scoring_data.get('metrics', {})
            last_qa.feedback = scoring_data.get('turn_feedback', '')
            
            # Update state metrics
            self._update_state_metrics(state, scoring_data)
            
            logger.info(f"Answer scored: {last_qa.score}/100")
            return state
            
        except Exception as e:
            logger.error(f"Error scoring answer: {e}")
            state['error'] = str(e)
            return state
    
    def _update_state_metrics(self, state: InterviewState, scoring_data: Dict[str, Any]) -> None:
        """Update state with scoring data."""
        # Update flat scores (0-100 scale)
        metrics = scoring_data.get('metrics', {})
        for metric_name, score in metrics.items():
            # Convert 1-5 scale to 0-100 scale
            normalized_score = ((score - 1) / 4) * 100
            state['flat_scores'][metric_name] = normalized_score
        
        # Update granular scores
        granular_justifications = scoring_data.get('granular_justifications', {})
        for metric_name, justification_data in granular_justifications.items():
            state['granular_scores'][metric_name] = GranularScore(
                score=justification_data.get('score', 3.0),
                justification=justification_data.get('justification', ''),
                strengths=justification_data.get('strengths', []),
                areas_for_improvement=justification_data.get('areas_for_improvement', [])
            )
        
        # Update metric improvement history
        for metric_name, score in metrics.items():
            if metric_name not in state['metric_improvement_history']:
                state['metric_improvement_history'][metric_name] = []
            
            normalized_score = ((score - 1) / 4) * 100
            state['metric_improvement_history'][metric_name].append(normalized_score)
        
        # Update weighted metrics current scores
        for metric in state['weighted_metrics']:
            if metric.metric_name in state['flat_scores']:
                metric.current_score = state['flat_scores'][metric.metric_name]
        
        # Update overall average
        if state['conversation_history']:
            scores = [qa.score for qa in state['conversation_history'] if qa.score is not None]
            if scores:
                state['average_score'] = sum(scores) / len(scores)
    
    def _create_fallback_scoring(self, metrics_list: List[str]) -> Dict[str, Any]:
        """Create fallback scoring when LLM response fails."""
        fallback_metrics = {metric: 3.0 for metric in metrics_list}  # Average scores
        fallback_granular = {
            metric: {
                "score": 3.0,
                "justification": "Unable to generate detailed scoring due to technical error.",
                "strengths": ["Response provided"],
                "areas_for_improvement": ["Technical scoring error occurred"]
            } for metric in metrics_list
        }
        
        return {
            "overall_score": 60.0,  # Average score
            "metrics": fallback_metrics,
            "granular_justifications": fallback_granular,
            "turn_feedback": "Thank you for your response. Please continue with the next question."
        }
    
    # ============================================================================
    # FEEDBACK NODES
    # ============================================================================
    
    def generate_feedback(self, state: InterviewState) -> InterviewState:
        """
        Generate real-time feedback for the candidate.
        
        Node: generate_feedback
        Purpose: Create constructive feedback based on latest performance
        """
        try:
            if not state.get('conversation_history'):
                return state
            
            last_qa = state['conversation_history'][-1]
            logger.info("Generating real-time feedback")
            
            # Prepare granular feedback for prompt
            granular_feedback_dict = {}
            for metric_name, granular_data in state['granular_scores'].items():
                granular_feedback_dict[metric_name] = {
                    'score': granular_data.score,
                    'justification': granular_data.justification,
                    'strengths': granular_data.strengths,
                    'areas_for_improvement': granular_data.areas_for_improvement
                }
            
            prompt = self.templates.REAL_TIME_FEEDBACK_PROMPT.format(
                interviewer_persona=state['interviewer_persona'],
                interview_type=state['interview_type'],
                question=last_qa.question,
                answer=last_qa.answer,
                overall_score=last_qa.score or 50,
                granular_feedback_json=json.dumps(granular_feedback_dict, indent=2)
            )
            
            response = self._invoke_llm(prompt)
            feedback_summary = response.strip()
            
            # Create feedback object
            coaching_focus = self._identify_coaching_focus(state)
            
            state['real_time_feedback'] = RealtimeFeedback(
                summary=feedback_summary,
                granular_details=state['granular_scores'].copy(),
                coaching_focus=coaching_focus
            )
            
            logger.info(f"Feedback generated, focus: {coaching_focus}")
            return state
            
        except Exception as e:
            logger.error(f"Error generating feedback: {e}")
            # Fallback feedback
            state['real_time_feedback'] = RealtimeFeedback(
                summary="Thank you for your response. Please continue with the next question.",
                coaching_focus="general"
            )
            return state
    
    def _identify_coaching_focus(self, state: InterviewState) -> str:
        """Identify the primary area needing coaching."""
        if not state.get('flat_scores'):
            return "general"
        
        # Find metric with lowest score
        lowest_metric = min(state['flat_scores'].items(), key=lambda x: x[1])
        return lowest_metric[0]
    
    # ============================================================================
    # SELECTION NODES
    # ============================================================================
    
    def select_next_action(self, state: InterviewState) -> InterviewState:
        """
        Select next action using weighted metric selection.
        
        Node: select_next_action
        Purpose: Determine what type of question to ask next based on performance gaps
        """
        try:
            logger.info("Selecting next action strategy")
            
            # Weighted metric selection
            selected_metric = self._weighted_metric_selection(state)
            state['current_target_metric'] = selected_metric
            
            # Determine action strategy
            action_strategy = self._determine_action_strategy(state, selected_metric)
            state['next_action'] = action_strategy
            
            # Update weakness tracking
            state['weakness_tracking'][selected_metric] = state['weakness_tracking'].get(selected_metric, 0) + 1
            
            logger.info(f"Selected action: {action_strategy.value}, target metric: {selected_metric}")
            return state
            
        except Exception as e:
            logger.error(f"Error selecting next action: {e}")
            state['next_action'] = ActionType.CONTINUE_STANDARD
            return state
    
    def _weighted_metric_selection(self, state: InterviewState) -> str:
        """Core weighted metric selector with probabilistic weakness targeting."""
        if not state.get('flat_scores'):
            # First turn - return first metric
            return state['weighted_metrics'][0].metric_name if state['weighted_metrics'] else 'technical_acumen'
        
        # Calculate selection weights based on inverse performance
        metric_weights = []
        metric_names = []
        
        for metric in state['weighted_metrics']:
            metric_name = metric.metric_name
            current_score = state['flat_scores'].get(metric_name, 50.0)
            
            # Calculate weight based on inverse performance
            if current_score <= 20:    # Very poor
                weight = 10.0
            elif current_score <= 40:  # Poor
                weight = 5.0
            elif current_score <= 60:  # Average
                weight = 2.0
            elif current_score <= 80:  # Good
                weight = 0.5
            else:                     # Excellent
                weight = 0.1
            
            # Reduce weight if addressed multiple times
            times_addressed = state['weakness_tracking'].get(metric_name, 0)
            if times_addressed > 2:
                weight *= 0.3
            
            metric_weights.append(weight)
            metric_names.append(metric_name)
        
        # Weighted random selection
        if metric_names and metric_weights:
            return random.choices(metric_names, weights=metric_weights)[0]
        
        return state['weighted_metrics'][0].metric_name if state['weighted_metrics'] else 'technical_acumen'
    
    def _determine_action_strategy(self, state: InterviewState, target_metric: str) -> ActionType:
        """Determine specific action strategy based on target metric and context."""
        # Base action mapping
        metric_action_map = {
            "technical_acumen": ActionType.ASK_TECHNICAL_DEEP_DIVE,
            "problem_solving": ActionType.ASK_PROBLEM_SOLVING,
            "communication": ActionType.ASK_BEHAVIORAL,
            "experience_relevance": ActionType.ASK_BEHAVIORAL,
            "system_design": ActionType.ASK_SYSTEM_DESIGN,
            "coding_skills": ActionType.ASK_TECHNICAL_DEEP_DIVE,
            "leadership": ActionType.ASK_BEHAVIORAL
        }
        
        base_action = metric_action_map.get(target_metric, ActionType.CONTINUE_STANDARD)
        
        # Contextual adjustments
        if "senior" in state['interview_type'].lower() and target_metric == "technical_acumen":
            base_action = ActionType.ASK_SYSTEM_DESIGN
        elif state['question_count'] >= state['max_questions'] - 2:
            base_action = ActionType.ASK_CLOSING
        elif state['current_interview_stage'] == InterviewStage.OPENING and state['question_count'] <= 2:
            base_action = ActionType.CONTINUE_STANDARD
        
        return base_action
    
    # ============================================================================
    # QUESTION GENERATION NODES
    # ============================================================================
    
    def generate_question(self, state: InterviewState) -> InterviewState:
        """
        Generate next interview question based on selected strategy.
        
        Node: generate_question
        Purpose: Create targeted question to address performance gaps
        """
        try:
            logger.info(f"Generating question for action: {state['next_action'].value}")
            
            # Build context for question generation
            conversation_context = self.templates.format_conversation_context(state['conversation_history'])
            performance_context = self.templates.format_performance_context(state['flat_scores'])
            
            # Build target metric context
            target_metric_context = ""
            if state.get('current_target_metric') and state['current_target_metric'] in state['granular_scores']:
                granular_data = state['granular_scores'][state['current_target_metric']]
                target_metric_context = self.templates.format_target_metric_context(
                    metric_name=state['current_target_metric'],
                    current_score=state['flat_scores'].get(state['current_target_metric'], 0),
                    granular_data={
                        'areas_for_improvement': granular_data.areas_for_improvement,
                        'strengths': granular_data.strengths
                    },
                    times_addressed=state['weakness_tracking'].get(state['current_target_metric'], 0),
                    improvement_history=state['metric_improvement_history'].get(state['current_target_metric'], [])
                )
            
            last_answer = state['conversation_history'][-1].answer if state['conversation_history'] else 'N/A'
            persona_instructions = self.templates.get_persona_instructions(state['interviewer_persona'])
            
            prompt = self.templates.ADAPTIVE_QUESTION_PROMPT.format(
                interviewer_persona=state['interviewer_persona'],
                interview_type=state['interview_type'],
                job_description=state.get('job_description', 'No specific job description provided'),
                conversation_context=conversation_context,
                performance_context=performance_context,
                current_target_metric=state.get('current_target_metric', 'general'),
                target_metric_context=target_metric_context,
                next_action=state['next_action'].value,
                current_interview_stage=state['current_interview_stage'].value,
                question_count=state['question_count'],
                max_questions=state['max_questions'],
                last_answer=last_answer,
                persona_instructions=persona_instructions
            )
            
            response = self._invoke_llm(prompt)
            next_question = response.strip()
            
            # Update state
            state['current_question'] = next_question
            state['question_count'] += 1
            
            # Update interview stage
            self._update_interview_stage(state)
            
            logger.info(f"Generated question #{state['question_count']}: {next_question[:100]}...")
            return state
            
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            # Fallback question based on interview type and stage
            if state['current_interview_stage'] == InterviewStage.OPENING:
                fallback_question = f"Can you tell me about a challenging {state['interview_type']} project you've worked on recently?"
            elif state['current_interview_stage'] == InterviewStage.TECHNICAL:
                fallback_question = f"How would you approach designing a scalable system for {state['interview_type']}?"
            elif state['current_interview_stage'] == InterviewStage.BEHAVIORAL:
                fallback_question = "Tell me about a time when you had to work with a difficult team member. How did you handle it?"
            else:
                fallback_question = "Do you have any questions for me about the role or the company?"
            
            state['current_question'] = fallback_question
            state['question_count'] += 1
            return state
    
    def _update_interview_stage(self, state: InterviewState) -> None:
        """Update interview stage based on progress."""
        if state['question_count'] <= 2:
            state['current_interview_stage'] = InterviewStage.OPENING
        elif state['question_count'] <= 6:
            state['current_interview_stage'] = InterviewStage.TECHNICAL
        elif state['question_count'] <= 8:
            state['current_interview_stage'] = InterviewStage.BEHAVIORAL
        else:
            state['current_interview_stage'] = InterviewStage.CLOSING
    
    # ============================================================================
    # COMPLETION NODES
    # ============================================================================
    
    def check_completion(self, state: InterviewState) -> InterviewState:
        """
        Check if interview should be completed.
        
        Node: check_completion
        Purpose: Determine if interview goals have been met or limits reached
        """
        try:
            should_end = False
            completion_reason = None
            
            # Max questions reached
            if state['question_count'] >= state['max_questions']:
                should_end = True
                completion_reason = "Maximum questions reached"
            
            # Rubric saturation check - all metrics at threshold
            elif state.get('flat_scores') and len(state['flat_scores']) >= len(state['weighted_metrics']):
                if all(score >= 75.0 for score in state['flat_scores'].values()) and state['question_count'] >= 4:
                    should_end = True
                    completion_reason = "All performance targets achieved"
            
            # Metric stagnation check
            elif self._check_metric_stagnation(state):
                should_end = True
                completion_reason = "Multiple metrics showing no improvement after repeated targeting"
            
            # Early termination for very poor performance
            elif state.get('flat_scores') and state['question_count'] >= 4:
                poor_metrics = sum(1 for score in state['flat_scores'].values() if score < 30)
                if poor_metrics >= len(state['flat_scores']) * 0.6:
                    should_end = True
                    completion_reason = "Performance threshold not met across multiple competencies"
            
            if should_end:
                state['interview_complete'] = True
                state['completion_reason'] = completion_reason
                state['current_interview_stage'] = InterviewStage.COMPLETED
                logger.info(f"Interview completion triggered: {completion_reason}")
            
            return state
            
        except Exception as e:
            logger.error(f"Error checking completion: {e}")
            return state
    
    def _check_metric_stagnation(self, state: InterviewState) -> bool:
        """Check if metrics are showing no improvement after multiple attempts."""
        if not state.get('metric_improvement_history'):
            return False
        
        stagnant_metrics = 0
        total_metrics = len(state['weighted_metrics'])
        
        for metric_name, history in state['metric_improvement_history'].items():
            if len(history) >= 3:
                # Check if last 3 scores show no significant improvement
                recent_scores = history[-3:]
                if max(recent_scores) - min(recent_scores) < 5:
                    times_addressed = state['weakness_tracking'].get(metric_name, 0)
                    if times_addressed >= 3:
                        stagnant_metrics += 1
        
        return stagnant_metrics >= total_metrics * 0.5
    
    def generate_final_summary(self, state: InterviewState) -> InterviewState:
        """
        Generate comprehensive final interview summary.
        
        Node: generate_final_summary
        Purpose: Create detailed performance analysis and recommendation
        """
        try:
            logger.info("Generating final interview summary")
            
            # Format conversation summary (last 3 exchanges)
            conversation_summary = "\n".join([
                f"Q: {qa.question}\nA: {qa.answer}\nScore: {qa.score}/100\n"
                for qa in state['conversation_history'][-3:]
            ])
            
            # Format metrics performance
            metrics_performance = self.templates.format_metrics_performance([
                {
                    'metric_name': m.metric_name,
                    'current_score': m.current_score,
                    'weight': m.weight,
                    'target_threshold': m.target_threshold
                } for m in state['weighted_metrics']
            ])
            
            prompt = self.templates.FINAL_SUMMARY_PROMPT.format(
                interview_type=state['interview_type'],
                question_count=state['question_count'],
                average_score=state.get('average_score', 0) or 0,
                completion_reason=state.get('completion_reason', 'Interview completed'),
                conversation_summary=conversation_summary,
                metrics_performance=metrics_performance
            )
            
            response = self._invoke_llm(prompt)
            final_summary = response.strip()
            
            state['overall_performance_summary'] = final_summary
            
            logger.info("Final summary generated successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error generating final summary: {e}")
            # Fallback summary
            avg_score = state.get('average_score', 0) or 0
            state['overall_performance_summary'] = (
                f"Interview completed with {state['question_count']} questions. "
                f"Average performance: {avg_score:.1f}/100. "
                f"Completion reason: {state.get('completion_reason', 'Interview completed')}."
            )
            return state
    
    # ============================================================================
    # PROCESSING NODES
    # ============================================================================
    
    def process_candidate_answer(self, state: InterviewState, candidate_answer: str, duration_seconds: float = None) -> InterviewState:
        """
        Process a candidate's answer and add it to conversation history.
        
        Node: process_candidate_answer
        Purpose: Handle candidate response and prepare for scoring
        """
        try:
            logger.info(f"Processing candidate answer for question {state['question_count']}")
            
            # Create Q&A pair
            qa_pair = QuestionAnswerPair(
                question=state['current_question'],
                answer=candidate_answer,
                timestamp=datetime.now().isoformat(),
                duration_seconds=duration_seconds
            )
            
            # Add to conversation history
            state['conversation_history'].append(qa_pair)
            
            logger.info("Candidate answer processed and added to history")
            return state
            
        except Exception as e:
            logger.error(f"Error processing candidate answer: {e}")
            state['error'] = str(e)
            return state
