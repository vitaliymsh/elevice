"""
LangChain-Style Prompt Templates for Interview Agent
===================================================

This module contains all prompt templates used by the interview agent.
Uses a simplified PromptTemplate-like structure for structured, reusable prompts.
"""

from typing import Dict, List, Optional, Any

class PromptTemplate:
    """Simplified PromptTemplate for interview prompts."""
    
    def __init__(self, input_variables: List[str], template: str):
        self.input_variables = input_variables
        self.template = template
    
    def format(self, **kwargs) -> str:
        """Format the template with provided variables."""
        return self.template.format(**kwargs)

class InterviewPromptTemplates:
    """
    LangChain-based prompt templates for the interview agent.
    
    All prompts are structured using LangChain's PromptTemplate for better
    maintainability, validation, and integration with the LangGraph workflow.
    """
    
    # ============================================================================
    # SCORING PROMPTS
    # ============================================================================
    
    ENHANCED_SCORING_PROMPT = PromptTemplate(
        input_variables=[
            "interview_type", "job_description", "interviewer_persona", 
            "current_question", "answer", "metrics_list", "wpm_context", 
            "conversation_context"
        ],
        template="""You are an expert technical interviewer conducting a {interview_type} interview.

INTERVIEW CONTEXT:
- Position: {interview_type}
- Job Description: {job_description}
- Interviewer Persona: {interviewer_persona}

CURRENT QUESTION: {current_question}

CANDIDATE'S ANSWER: {answer}

{wpm_context}

CONVERSATION CONTEXT:
{conversation_context}

SCORING TASK:
Please provide a comprehensive evaluation of this answer across the following metrics: {metrics_list}

For each metric, score on a 1-5 scale where:
- 1 = Poor (significant gaps, unclear, irrelevant)
- 2 = Below Average (some issues, partially relevant)
- 3 = Average (meets basic expectations)
- 4 = Good (solid response, well-articulated)
- 5 = Excellent (exceptional insight, clear expertise)

REQUIRED JSON RESPONSE FORMAT:
{{
    "overall_score": <float 0-100>,
    "metrics": {{
        {metrics_json_template}
    }},
    "granular_justifications": {{
        {granular_json_template}
    }},
    "turn_feedback": "<constructive feedback for this specific answer>",
    "improvement_suggestions": ["<specific suggestion 1>", "<specific suggestion 2>"]
}}

Focus on:
1. Technical accuracy and depth
2. Communication clarity
3. Relevant experience demonstration
4. Problem-solving approach
5. Professional presentation

Provide specific, actionable feedback that helps the candidate improve."""
    )
    
    # ============================================================================
    # QUESTION GENERATION PROMPTS  
    # ============================================================================
    
    ADAPTIVE_QUESTION_PROMPT = PromptTemplate(
        input_variables=[
            "interviewer_persona", "interview_type", "job_description",
            "conversation_context", "performance_context", "current_target_metric",
            "target_metric_context", "next_action", "current_interview_stage",
            "question_count", "max_questions", "last_answer", "persona_instructions"
        ],
        template="""You are a {interviewer_persona} conducting a {interview_type} interview.

INTERVIEW CONTEXT:
- Position: {interview_type}
- Job Description: {job_description}
- Current Stage: {current_interview_stage}
- Question #{question_count} of {max_questions}

PERSONA INSTRUCTIONS:
{persona_instructions}

CONVERSATION HISTORY:
{conversation_context}

PERFORMANCE ANALYSIS:
{performance_context}

TARGET METRIC FOCUS: {current_target_metric}
{target_metric_context}

LAST CANDIDATE ANSWER:
{last_answer}

NEXT ACTION STRATEGY: {next_action}

TASK: Generate the next interview question based on the above context.

REQUIREMENTS:
1. Target the {current_target_metric} metric specifically
2. Build naturally on the conversation flow
3. Match the {interviewer_persona} style
4. Be appropriate for {current_interview_stage} stage
5. Address performance gaps identified in the analysis

QUESTION TYPES BY ACTION:
- ask_technical_deep_dive: Deep technical questions, system design, architecture
- ask_problem_solving: Algorithm, debugging, complex problem scenarios  
- ask_behavioral_question: STAR method, leadership, teamwork, challenges
- ask_system_design: Large-scale systems, trade-offs, scalability
- ask_closing_question: Final thoughts, questions for the interviewer

Generate a single, well-crafted question that:
- Is specific and actionable
- Allows the candidate to demonstrate the target metric
- Maintains natural conversation flow
- Provides opportunity for detailed response

QUESTION:"""
    )
    
    OPENING_QUESTION_PROMPT = PromptTemplate(
        input_variables=["interviewer_persona", "interview_type", "job_description", "persona_instructions"],
        template="""You are a {interviewer_persona} starting a {interview_type} interview.

INTERVIEW CONTEXT:
- Position: {interview_type}
- Job Description: {job_description}

PERSONA INSTRUCTIONS:
{persona_instructions}

TASK: Generate an engaging opening question that:
1. Sets a welcoming, professional tone
2. Allows the candidate to introduce themselves naturally
3. Relates to the {interview_type} position
4. Encourages the candidate to highlight relevant experience
5. Follows the {interviewer_persona} style

The opening question should be conversational yet professional, giving the candidate 
a chance to warm up while providing valuable insights into their background.

OPENING QUESTION:"""
    )
    
    # ============================================================================
    # FEEDBACK PROMPTS
    # ============================================================================
    
    REAL_TIME_FEEDBACK_PROMPT = PromptTemplate(
        input_variables=[
            "interviewer_persona", "interview_type", "question", "answer", 
            "overall_score", "granular_feedback_json"
        ],
        template="""You are a {interviewer_persona} providing constructive real-time feedback.

INTERVIEW CONTEXT:
- Position: {interview_type}
- Question: {question}
- Candidate's Answer: {answer}
- Overall Score: {overall_score}/100

DETAILED SCORING:
{granular_feedback_json}

TASK: Generate encouraging, constructive real-time feedback that:
1. Acknowledges strengths in the candidate's response
2. Provides specific, actionable improvement suggestions
3. Maintains a supportive, professional tone
4. Explains why certain follow-up questions might be asked
5. Keeps the candidate motivated and engaged

FEEDBACK STYLE:
- Be specific about what was done well
- Frame improvements as opportunities, not criticisms
- Use encouraging language ("Great insight on...", "To build on that...")
- Provide clear reasoning for any concerns
- End on a positive note

REAL-TIME FEEDBACK:"""
    )
    
    # ============================================================================
    # SUMMARY PROMPTS
    # ============================================================================
    
    FINAL_SUMMARY_PROMPT = PromptTemplate(
        input_variables=[
            "interview_type", "question_count", "average_score", "completion_reason",
            "conversation_summary", "metrics_performance"
        ],
        template="""Generate a comprehensive final interview summary.

INTERVIEW DETAILS:
- Position: {interview_type}
- Questions Asked: {question_count}
- Average Score: {average_score}/100
- Completion Reason: {completion_reason}

PERFORMANCE BY METRIC:
{metrics_performance}

CONVERSATION SUMMARY (Last 3 exchanges):
{conversation_summary}

TASK: Create a detailed final summary that includes:

1. OVERALL ASSESSMENT (2-3 sentences)
2. KEY STRENGTHS (3-4 bullet points)
3. AREAS FOR IMPROVEMENT (3-4 bullet points)
4. SPECIFIC EXAMPLES from the conversation
5. RECOMMENDATION (Hire/No Hire/Additional Interview with reasoning)

The summary should be professional, balanced, and actionable for hiring decisions.

FINAL INTERVIEW SUMMARY:"""
    )
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    @staticmethod
    def format_conversation_context(conversation_history: List[Dict[str, Any]]) -> str:
        """Format conversation history for prompt context."""
        if not conversation_history:
            return "No previous conversation."
        
        context_parts = []
        for i, qa in enumerate(conversation_history[-5:], 1):  # Last 5 exchanges
            context_parts.append(f"Q{i}: {qa.get('question', '')}")
            context_parts.append(f"A{i}: {qa.get('answer', '')}")
            if qa.get('score'):
                context_parts.append(f"Score: {qa['score']}/100")
            context_parts.append("")
        
        return "\n".join(context_parts)
    
    @staticmethod
    def format_performance_context(flat_scores: Dict[str, float]) -> str:
        """Format performance metrics for prompt context."""
        if not flat_scores:
            return "No performance data yet."
        
        context_parts = ["CURRENT PERFORMANCE:"]
        for metric, score in flat_scores.items():
            status = "✓" if score >= 75 else "⚠" if score >= 50 else "✗"
            context_parts.append(f"{status} {metric}: {score:.1f}/100")
        
        return "\n".join(context_parts)
    
    @staticmethod
    def format_target_metric_context(
        metric_name: str,
        current_score: float,
        granular_data: Dict[str, Any],
        times_addressed: int,
        improvement_history: List[float]
    ) -> str:
        """Format target metric context for focused question generation."""
        context_parts = [f"TARGET METRIC: {metric_name}"]
        context_parts.append(f"Current Score: {current_score}/100")
        context_parts.append(f"Times Previously Addressed: {times_addressed}")
        
        if improvement_history:
            trend = "improving" if len(improvement_history) > 1 and improvement_history[-1] > improvement_history[-2] else "needs attention"
            context_parts.append(f"Performance Trend: {trend}")
        
        if granular_data.get('areas_for_improvement'):
            context_parts.append("Areas for Improvement:")
            for area in granular_data['areas_for_improvement']:
                context_parts.append(f"- {area}")
        
        return "\n".join(context_parts)
    
    @staticmethod
    def format_metrics_performance(weighted_metrics: List[Dict[str, Any]]) -> str:
        """Format weighted metrics performance for summary."""
        if not weighted_metrics:
            return "No metrics data available."
        
        performance_parts = []
        for metric in weighted_metrics:
            name = metric.get('metric_name', 'Unknown')
            score = metric.get('current_score', 0) or 0
            weight = metric.get('weight', 0) * 100
            threshold = metric.get('target_threshold', 75)
            
            status = "ACHIEVED" if score >= threshold else "BELOW TARGET"
            performance_parts.append(f"- {name}: {score:.1f}/100 (Weight: {weight:.0f}%) - {status}")
        
        return "\n".join(performance_parts)
    
    @staticmethod  
    def get_persona_instructions(persona: str) -> str:
        """Get specific instructions for different interviewer personas."""
        persona_map = {
            "Standard Technical Interviewer": """
- Ask clear, direct technical questions
- Focus on problem-solving approach
- Maintain professional but friendly tone
- Probe for depth when answers are surface-level
- Encourage detailed explanations
            """,
            "Senior Engineering Manager": """
- Focus on system design and architecture decisions
- Ask about leadership and mentoring experience  
- Probe for scalability and technical trade-offs
- Assess communication with non-technical stakeholders
- Look for strategic thinking and long-term vision
            """,
            "Startup CTO": """
- Emphasize adaptability and quick learning
- Ask about experience with resource constraints
- Focus on end-to-end ownership and versatility
- Probe for innovation and creative problem-solving
- Assess comfort with ambiguity and rapid iteration
            """,
            "Big Tech Senior Engineer": """
- Deep dive into algorithms and data structures
- Focus on code efficiency and optimization
- Ask about large-scale system design
- Probe for experience with complex distributed systems
- Assess ability to work in large engineering organizations
            """
        }
        
        return persona_map.get(persona, persona_map["Standard Technical Interviewer"])
    
    @staticmethod
    def build_wpm_context(duration_seconds: Optional[float], answer: str) -> str:
        """Build words-per-minute context if duration is available."""
        if not duration_seconds or not answer:
            return ""
        
        word_count = len(answer.split())
        wpm = (word_count / duration_seconds) * 60
        
        if wpm < 120:
            pace_assessment = "slow pace - may indicate thoughtfulness or hesitation"
        elif wpm > 180:
            pace_assessment = "fast pace - may indicate confidence or nervousness"
        else:
            pace_assessment = "normal conversational pace"
        
        return f"\nSPEECH ANALYSIS:\n- Duration: {duration_seconds:.1f} seconds\n- Word count: {word_count}\n- Speaking rate: {wpm:.1f} WPM ({pace_assessment})"
    
    @staticmethod
    def create_metrics_json_template(metrics_list: List[str]) -> str:
        """Create JSON template for metrics scoring."""
        return ",\n        ".join([f'"{metric}": <float 1-5>' for metric in metrics_list])
    
    @staticmethod
    def create_granular_json_template(metrics_list: List[str]) -> str:
        """Create JSON template for granular justifications."""
        template_parts = []
        for metric in metrics_list:
            template_parts.append(f'''"{metric}": {{
            "score": <float 1-5>,
            "justification": "<detailed reasoning for score>",
            "strengths": ["<strength 1>", "<strength 2>"],
            "areas_for_improvement": ["<improvement 1>", "<improvement 2>"]
        }}''')
        return ",\n        ".join(template_parts)
