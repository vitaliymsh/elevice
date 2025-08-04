from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import uuid

class UserSession(BaseModel):
    """Represents an anonymous user session in the database."""
    user_id: uuid.UUID
    created_at: datetime
    last_active: datetime

class Interview(BaseModel):
    """Represents an interview session in the database."""
    interview_id: uuid.UUID
    user_id: uuid.UUID
    status: str = "in_progress"
    created_at: datetime
    job_id: Optional[uuid.UUID] = None

class InterviewTurn(BaseModel):
    """Represents a single question/answer turn in the database."""
    turn_id: uuid.UUID
    interview_id: uuid.UUID
    turn_index: int
    speaker: str  # 'AI' or 'User'
    text: str
    feedback: Optional[dict] = None
    created_at: datetime
    duration_seconds: Optional[float] = None  # Duration of the turn in seconds


class InterviewParameters(BaseModel):
    """Parameters for an interview session."""
    interview_id: uuid.UUID
    max_questions: int = 10
    interviewer_persona: str
    interview_type: str

class InterviewWithParameters(BaseModel):
    """Interview session with parameters."""
    interview: Interview
    parameters: InterviewParameters


# ---------------------------------------------------------
# Final Report Models
# ---------------------------------------------------------

class InterviewFinalReport(BaseModel):
    """Comprehensive final interview report."""
    interview_id: str
    generated_at: datetime
    completion_reason: str  # 'max_questions_reached', 'manual_end', 'performance_threshold', 'metric_stagnation'
    
    # Interview Summary
    total_questions: int
    interview_duration_minutes: Optional[float] = None
    average_score: float
    
    # Performance Metrics
    metric_scores: Dict[str, float]  # {"technical_acumen": 75.5, "communication": 82.0, ...}
    metric_trends: Optional[Dict[str, List[float]]] = None  # Score progression over time
    performance_summary: str  # LLM-generated narrative
    
    # Analysis
    key_strengths: List[str]
    areas_for_improvement: List[str]
    improvement_recommendations: List[str]
    
    # Interview Flow Analysis
    question_types_covered: Dict[str, int]  # {"technical": 4, "behavioral": 3, ...}
    engagement_metrics: Dict[str, Any]  # Response times, completeness, etc.
    
    # Final Assessment
    overall_assessment: str  # "Recommended", "Not Recommended", "Borderline - Needs Follow-up"
    confidence_score: int  # 0-100
    hiring_recommendation: str
    
    # Additional Context
    interviewer_notes: Optional[str] = None
    follow_up_areas: Optional[List[str]] = None

class Job(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    position: str
    user_id: uuid.UUID
    created_at: datetime