"""
Interview Agent State Definition
===============================

Comprehensive state management for the LangGraph-based interview agent.
Includes all necessary data structures for reasoning, acting, and planning.
"""

from typing import Dict, List, Optional, Any, Union, Literal
from typing_extensions import TypedDict, Annotated
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

# Core data structures
class QuestionAnswerPair(BaseModel):
    """Represents a Q&A exchange in the interview."""
    question: str
    answer: str
    timestamp: str
    score: Optional[float] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    feedback: Optional[str] = None
    reasoning_trace: Optional[List[str]] = None  # ReAct reasoning steps

class WeightedMetric(BaseModel):
    """Performance metric with weight and current score."""
    metric_name: str
    weight: float
    target_threshold: float
    current_score: Optional[float] = None

class InterviewPlan(BaseModel):
    """Dynamic interview plan with strategy adjustments."""
    current_strategy: str
    planned_topics: List[str]
    covered_topics: List[str]
    priority_areas: List[str]
    adaptation_reason: Optional[str] = None
    confidence_level: float = 0.5
    
    def get(self, key: str, default=None):
        """Add dict-like get method for compatibility."""
        return getattr(self, key, default)
    
    def __setitem__(self, key: str, value):
        """Add dict-like item assignment for compatibility."""
        setattr(self, key, value)
    
    def __getitem__(self, key: str):
        """Add dict-like item access for compatibility."""
        return getattr(self, key)

class KnowledgeContext(BaseModel):
    """Job-specific and industry knowledge context."""
    job_requirements: List[str] = Field(default_factory=list)
    industry_standards: Dict[str, Any] = Field(default_factory=dict)
    technical_benchmarks: Dict[str, List[str]] = Field(default_factory=dict)
    best_practices: List[str] = Field(default_factory=list)
    common_patterns: Dict[str, str] = Field(default_factory=dict)

class ReActStep(BaseModel):
    """Single step in ReAct (Reasoning + Acting) pattern."""
    step_type: Literal["thought", "action", "observation"]
    content: str
    timestamp: str
    tool_used: Optional[str] = None
    result: Optional[Any] = None

class AgentMemory(BaseModel):
    """Enhanced memory system for the agent."""
    working_memory: Dict[str, Any] = Field(default_factory=dict)
    long_term_patterns: Dict[str, List[str]] = Field(default_factory=dict)
    candidate_profile: Dict[str, Any] = Field(default_factory=dict)
    interaction_history: List[str] = Field(default_factory=list)

# Main state class - TypedDict for LangGraph compatibility
class InterviewAgentState(TypedDict, total=False):
    """
    Complete state for the interview agent graph.
    
    This state travels through all nodes and contains everything
    the agent needs for reasoning, acting, and planning.
    """
    
    # Core Interview Info
    session_id: str
    interview_id: Optional[str]
    interview_type: str
    job_description: Optional[str]
    interviewer_persona: str
    
    # Current Status
    current_question: str
    question_count: int
    max_questions: int
    interview_complete: bool
    completion_reason: Optional[str]
    
    # Performance Tracking
    conversation_history: List[QuestionAnswerPair]
    weighted_metrics: List[WeightedMetric]
    flat_scores: Dict[str, float]  # Easy access scores
    average_score: Optional[float]
    
    # ReAct Pattern Components
    current_thought: Optional[str]
    current_action: Optional[str]
    current_observation: Optional[str]
    react_steps: List[ReActStep]
    reasoning_trace: List[str]
    
    # Dynamic Planning
    interview_plan: InterviewPlan
    strategy_adjustments: List[str]
    adaptation_triggers: List[str]
    
    # Knowledge & Context
    knowledge_context: KnowledgeContext
    agent_memory: AgentMemory
    external_context: Dict[str, Any]
    
    # Tool Integration
    available_tools: List[str]
    tool_results: Dict[str, Any]
    last_tool_used: Optional[str]
    
    # Feedback & Analysis
    real_time_feedback: Optional[Dict[str, Any]]
    granular_scores: Dict[str, Dict[str, Any]]
    coaching_focus: Optional[str]
    
    # Advanced Features
    confidence_scores: Dict[str, float]
    uncertainty_areas: List[str]
    next_action_plan: List[str]
    
    # Streaming & UX
    streaming_enabled: bool
    partial_responses: List[str]
    
    # Debug & Development
    debug_info: Dict[str, Any]
    performance_metrics: Dict[str, float]

def create_initial_state(
    interview_type: str,
    job_description: Optional[str] = None,
    interviewer_persona: str = "Technical Interviewer",
    weighted_metrics: Optional[List[WeightedMetric]] = None,
    max_questions: int = 10
) -> InterviewAgentState:
    """Create initial state for a new interview session."""
    
    session_id = str(uuid.uuid4())
    
    # Default metrics if none provided
    if not weighted_metrics:
        weighted_metrics = [
            WeightedMetric(
                metric_name="technical_acumen",
                weight=0.35,
                target_threshold=75.0
            ),
            WeightedMetric(
                metric_name="problem_solving", 
                weight=0.25,
                target_threshold=70.0
            ),
            WeightedMetric(
                metric_name="communication",
                weight=0.20,
                target_threshold=80.0
            ),
            WeightedMetric(
                metric_name="experience_relevance",
                weight=0.20, 
                target_threshold=70.0
            )
        ]
    
    return InterviewAgentState(
        # Core Info
        session_id=session_id,
        interview_id=None,
        interview_type=interview_type,
        job_description=job_description,
        interviewer_persona=interviewer_persona,
        
        # Current Status
        current_question="",
        question_count=0,
        max_questions=max_questions,
        interview_complete=False,
        completion_reason=None,
        
        # Performance
        conversation_history=[],
        weighted_metrics=weighted_metrics,
        flat_scores={},
        average_score=None,
        
        # ReAct Pattern
        current_thought=None,
        current_action=None,
        current_observation=None,
        react_steps=[],
        reasoning_trace=[],
        
        # Planning - ensure proper initialization
        interview_plan=InterviewPlan(
            current_strategy="opening",
            planned_topics=[],
            covered_topics=[],
            priority_areas=[],
            adaptation_reason=None,
            confidence_level=0.5
        ),
        strategy_adjustments=[],
        adaptation_triggers=[],
        
        # Knowledge
        knowledge_context=KnowledgeContext(),
        agent_memory=AgentMemory(),
        external_context={},
        
        # Tools
        available_tools=["database_query", "knowledge_lookup", "performance_analysis"],
        tool_results={},
        last_tool_used=None,
        
        # Feedback
        real_time_feedback=None,
        granular_scores={},
        coaching_focus=None,
        
        # Advanced
        confidence_scores={},
        uncertainty_areas=[],
        next_action_plan=[],
        
        # Streaming
        streaming_enabled=False,
        partial_responses=[],
        
        # Debug
        debug_info={},
        performance_metrics={}
    )