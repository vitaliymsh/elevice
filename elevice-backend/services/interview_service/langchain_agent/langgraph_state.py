"""
LangGraph State Models for Interview Agent
=========================================

This module defines the state models used by the LangGraph-based interview agent.
The state flows through different nodes in the graph, maintaining context and data
throughout the interview process.
"""

from typing import Dict, List, Optional, Any, TypedDict
from datetime import datetime
import uuid
from dataclasses import dataclass, field
from enum import Enum

class InterviewStage(Enum):
    """Interview stages for better flow control."""
    OPENING = "opening"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral" 
    SYSTEM_DESIGN = "system_design"
    CLOSING = "closing"
    COMPLETED = "completed"

class ActionType(Enum):
    """Action types for next question strategy."""
    CONTINUE_STANDARD = "continue_standard_flow"
    ASK_TECHNICAL_DEEP_DIVE = "ask_technical_deep_dive"
    ASK_PROBLEM_SOLVING = "ask_problem_solving"
    ASK_BEHAVIORAL = "ask_behavioral_question"
    ASK_SYSTEM_DESIGN = "ask_system_design"
    ASK_CLOSING = "ask_closing_question"
    END_INTERVIEW = "end_interview"

@dataclass
class WeightedMetric:
    """Metric with weight and performance tracking."""
    metric_name: str
    weight: float
    target_threshold: float = 75.0
    current_score: Optional[float] = None

@dataclass 
class QuestionAnswerPair:
    """Single Q&A exchange with scoring."""
    question: str
    answer: str
    timestamp: str
    score: Optional[float] = None
    metrics: Dict[str, float] = field(default_factory=dict)
    feedback: str = ""
    duration_seconds: Optional[float] = None

@dataclass
class GranularScore:
    """Detailed scoring data for a metric."""
    score: float  # 1-5 scale
    justification: str
    strengths: List[str] = field(default_factory=list)
    areas_for_improvement: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class RealtimeFeedback:
    """Real-time feedback structure."""
    summary: str
    granular_details: Dict[str, GranularScore] = field(default_factory=dict)
    coaching_focus: str = "general"
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

class InterviewState(TypedDict, total=False):
    """
    Main state object that flows through the LangGraph nodes.
    
    This replaces the previous InterviewState class with a TypedDict
    for better compatibility with LangGraph.
    """
    # Session Information
    session_id: str
    interview_type: str
    job_description: Optional[str]
    interviewer_persona: str
    created_at: str
    
    # Configuration
    weighted_metrics: List[WeightedMetric]
    max_questions: int
    
    # Current State
    current_question: str
    question_count: int
    current_interview_stage: InterviewStage
    current_target_metric: Optional[str]
    next_action: ActionType
    
    # Performance Tracking
    conversation_history: List[QuestionAnswerPair]
    flat_scores: Dict[str, float]  # metric_name -> 0-100 score
    granular_scores: Dict[str, GranularScore]  # metric_name -> detailed scoring
    metric_improvement_history: Dict[str, List[float]]  # metric_name -> score history
    weakness_tracking: Dict[str, int]  # metric_name -> times_addressed
    
    # Feedback and Analysis
    real_time_feedback: Optional[RealtimeFeedback]
    average_score: Optional[float]
    
    # Completion
    interview_complete: bool
    completion_reason: Optional[str]
    overall_performance_summary: Optional[str]
    
    # LangGraph specific
    messages: List[Dict[str, Any]]  # For message history if needed
    error: Optional[str]  # For error handling
    retry_count: int  # For retry logic

def create_initial_state(
    interview_type: str,
    job_description: Optional[str] = None,
    interviewer_persona: str = "Standard Technical Interviewer",
    weighted_metrics: Optional[List[WeightedMetric]] = None,
    max_questions: int = 10
) -> InterviewState:
    """Create initial interview state."""
    
    # Default metrics if none provided
    if weighted_metrics is None:
        weighted_metrics = [
            WeightedMetric(metric_name="technical_acumen", weight=0.35, target_threshold=75.0),
            WeightedMetric(metric_name="problem_solving", weight=0.25, target_threshold=70.0),
            WeightedMetric(metric_name="communication", weight=0.20, target_threshold=80.0),
            WeightedMetric(metric_name="experience_relevance", weight=0.20, target_threshold=70.0)
        ]
    
    return InterviewState(
        session_id=str(uuid.uuid4()),
        interview_type=interview_type,
        job_description=job_description,
        interviewer_persona=interviewer_persona,
        created_at=datetime.now().isoformat(),
        weighted_metrics=weighted_metrics,
        max_questions=max_questions,
        current_question="",
        question_count=0,
        current_interview_stage=InterviewStage.OPENING,
        current_target_metric=None,
        next_action=ActionType.CONTINUE_STANDARD,
        conversation_history=[],
        flat_scores={},
        granular_scores={},
        metric_improvement_history={},
        weakness_tracking={},
        real_time_feedback=None,
        average_score=None,
        interview_complete=False,
        completion_reason=None,
        overall_performance_summary=None,
        messages=[],
        error=None,
        retry_count=0
    )

def state_to_dict(state: InterviewState) -> Dict[str, Any]:
    """Convert state to dictionary for serialization."""
    result = dict(state)
    
    # Convert enums to strings
    if 'current_interview_stage' in result:
        result['current_interview_stage'] = result['current_interview_stage'].value
    if 'next_action' in result:
        result['next_action'] = result['next_action'].value
        
    # Convert dataclasses to dicts
    if 'weighted_metrics' in result:
        result['weighted_metrics'] = [
            {
                'metric_name': m.metric_name,
                'weight': m.weight,
                'target_threshold': m.target_threshold,
                'current_score': m.current_score
            } for m in result['weighted_metrics']
        ]
    
    if 'conversation_history' in result:
        result['conversation_history'] = [
            {
                'question': qa.question,
                'answer': qa.answer,
                'timestamp': qa.timestamp,
                'score': qa.score,
                'metrics': qa.metrics,
                'feedback': qa.feedback,
                'duration_seconds': qa.duration_seconds
            } for qa in result['conversation_history']
        ]
    
    if 'granular_scores' in result:
        result['granular_scores'] = {
            k: {
                'score': v.score,
                'justification': v.justification,
                'strengths': v.strengths,
                'areas_for_improvement': v.areas_for_improvement,
                'timestamp': v.timestamp
            } for k, v in result['granular_scores'].items()
        }
    
    if 'real_time_feedback' in result and result['real_time_feedback']:
        feedback = result['real_time_feedback']
        result['real_time_feedback'] = {
            'summary': feedback.summary,
            'granular_details': {
                k: {
                    'score': v.score,
                    'justification': v.justification,
                    'strengths': v.strengths,
                    'areas_for_improvement': v.areas_for_improvement,
                    'timestamp': v.timestamp
                } for k, v in feedback.granular_details.items()
            },
            'coaching_focus': feedback.coaching_focus,
            'timestamp': feedback.timestamp
        }
    
    return result

def dict_to_state(data: Dict[str, Any]) -> InterviewState:
    """Convert dictionary back to state object."""
    # Convert string enums back
    if 'current_interview_stage' in data:
        data['current_interview_stage'] = InterviewStage(data['current_interview_stage'])
    if 'next_action' in data:
        data['next_action'] = ActionType(data['next_action'])
    
    # Convert dicts back to dataclasses
    if 'weighted_metrics' in data:
        data['weighted_metrics'] = [
            WeightedMetric(**m) for m in data['weighted_metrics']
        ]
    
    if 'conversation_history' in data:
        data['conversation_history'] = [
            QuestionAnswerPair(**qa) for qa in data['conversation_history']
        ]
    
    if 'granular_scores' in data:
        data['granular_scores'] = {
            k: GranularScore(**v) for k, v in data['granular_scores'].items()
        }
    
    if 'real_time_feedback' in data and data['real_time_feedback']:
        feedback_data = data['real_time_feedback']
        granular_details = {
            k: GranularScore(**v) for k, v in feedback_data.get('granular_details', {}).items()
        }
        data['real_time_feedback'] = RealtimeFeedback(
            summary=feedback_data['summary'],
            granular_details=granular_details,
            coaching_focus=feedback_data.get('coaching_focus', 'general'),
            timestamp=feedback_data.get('timestamp', datetime.now().isoformat())
        )
    
    return InterviewState(data)
