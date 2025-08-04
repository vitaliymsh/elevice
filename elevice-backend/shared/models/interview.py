from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import uuid

class QuestionAnswerPair(BaseModel):
    """Enhanced Q&A pair with scoring and metadata."""
    question: str
    answer: str
    timestamp: Optional[str] = None
    score: Optional[int] = None  # 0-100 scale
    metrics: Optional[Dict[str, float]] = None  # Individual metric scores
    feedback: Optional[str] = None  # Turn-specific feedback

class WeightedMetric(BaseModel):
    """Configurable metric with weight for adaptive questioning."""
    metric_name: str  # e.g., "technical_acumen", "communication", "problem_solving"
    weight: float  # 0.0-1.0, sum should equal 1.0
    current_score: Optional[float] = None  # Running average
    target_threshold: Optional[float] = None  # Target score for this metric

class InterviewState(BaseModel):
    """Comprehensive state object for stateful interview agent with refined weakness tracking."""
    # Core identifiers
    session_id: str
    interview_type: str
    job_description: Optional[str] = None
    
    # Database integration
    database_interview_id: Optional[str] = None  # UUID of interview in database
    
    # Agent configuration
    interviewer_persona: str = "Standard Technical Interviewer"
    weighted_metrics: List[WeightedMetric] = Field(default_factory=list)
    max_questions: int = 10
    
    # Conversation state
    conversation_history: List[QuestionAnswerPair] = Field(default_factory=list)
    current_question: Optional[str] = None
    current_interview_stage: str = "opening"  # "opening", "technical", "behavioral", "closing"
    
    # Enhanced scoring tracking (NEW for refined plan)
    granular_scores: Dict[str, Dict[str, Any]] = Field(default_factory=dict)  # metric -> {score, justification}
    flat_scores: Dict[str, float] = Field(default_factory=dict)  # metric -> current_score for easy weakness identification
    current_target_metric: Optional[str] = None  # Which metric current question targets
    metric_improvement_history: Dict[str, List[float]] = Field(default_factory=dict)  # Track score changes over time
    weakness_tracking: Dict[str, int] = Field(default_factory=dict)  # metric -> times_addressed_count
    
    # Real-time feedback
    real_time_feedback: Optional[Union[str, Dict[str, Any]]] = None  # Enhanced feedback with granular details
    overall_performance_summary: Optional[str] = None
    
    # Agent decision state
    next_action: Optional[str] = None  # "ask_technical_deep_dive", "ask_soft_skill", "end_interview"
    interview_complete: bool = False
    completion_reason: Optional[str] = None
    
    # Metrics tracking
    average_score: Optional[float] = None
    question_count: int = 0
    interview_duration_minutes: Optional[float] = None
    
    # Historical context from previous interviews for same job
    historical_context: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class ConversationItem(BaseModel):
    """Represents a single Q&A exchange in the interview."""
    question: str
    answer: str
    timestamp: Optional[str] = None

class InterviewTurn(BaseModel):
    """Represents a single question/answer turn in the database."""
    turn_id: uuid.UUID
    interview_id: uuid.UUID
    turn_index: int
    speaker: str  # 'AI' or 'User'
    text: str
    feedback: Optional[dict] = None
    created_at: datetime
