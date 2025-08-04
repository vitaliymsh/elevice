from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import uuid

from .interview import ConversationItem, InterviewState, WeightedMetric
from .evaluation import TechnicalSpeechMetrics

# ---------------------------------------------------------
# TTS Models
# ---------------------------------------------------------

class TTSRequest(BaseModel):
    text: str

class TTSResponse(BaseModel):
    pass

# ---------------------------------------------------------
# Transcription Models
# ---------------------------------------------------------

class TranscriptionResponse(BaseModel):
    transcription: str
    duration_seconds: float = 0.0

# ---------------------------------------------------------
# Technical Speech Analysis Models
# ---------------------------------------------------------

class TechnicalSpeechAnalysisRequest(BaseModel):
    """Request for comprehensive technical speech analysis of entire interview."""
    interview_id: str  # Database ID to fetch complete interview data

class TechnicalSpeechAnalysisResponse(BaseModel):
    """Response containing comprehensive technical speech analysis."""
    interview_id: str
    total_duration_minutes: float
    total_word_count: int
    metrics: TechnicalSpeechMetrics
    overall_speech_grade: str  # "Excellent", "Good", "Fair", "Needs Improvement"
    key_recommendations: List[str]  # Top 3-5 actionable recommendations

# ---------------------------------------------------------
# Text-to-Speech (TTS) Models
# ---------------------------------------------------------

class TTSRequest(BaseModel):
    text: str

class TTSResponse(BaseModel):
    pass

# ---------------------------------------------------------
# Automated Answering Feature Models
# ---------------------------------------------------------

class AutoAnswerRequest(BaseModel):
    """Request to generate an automated answer to an interview question."""
    question: str
    interview_type: str
    conversation_history: List[ConversationItem] = []
    candidate_profile: Optional[str] = None  # Optional candidate background/profile
    difficulty_level: Optional[str] = "intermediate"  # "junior", "intermediate", "senior"

class AutoAnswerResponse(BaseModel):
    """Response containing an automated answer."""
    answer: str
    reasoning: Optional[str] = None  # Optional explanation of the answer approach
    duration_seconds: Optional[float] = None  # Estimated speaking duration based on text length and proficiency

# ---------------------------------------------------------
# Interview Session Models
# ---------------------------------------------------------

class StartInterviewRequestExtended(BaseModel):
    """Request to start a new interview session with database persistence."""
    user_id: uuid.UUID
    interview_type: str
    interview_id: Optional[str] = None  # If provided, start existing interview; if None, create new

class StartInterviewResponseExtended(BaseModel):
    """Response containing the interview_id and first question."""
    interview_id: uuid.UUID
    question: str
    message: str = "Interview started successfully"

# ---------------------------------------------------------
# Interview ID Based Models
# ---------------------------------------------------------

class InterviewStartRequest(BaseModel):
    """Start interview using only interview_id (created on frontend)."""
    interview_id: str  # UUID string created on frontend
    
class InterviewStartResponse(BaseModel):
    """Response for interview_id based start."""
    interview_id: str
    first_question: str
    interview_state: InterviewState
    status: str = "started"

class InterviewTurnRequest(BaseModel):
    """Process turn using interview_id."""
    interview_id: str
    user_response: str
    duration_seconds: Optional[float] = None

class InterviewTurnResponse(BaseModel):
    """Response for interview_id based turn processing."""
    interview_id: str
    next_question: Optional[str] = None
    interview_complete: bool = False
    interview_state: InterviewState
    real_time_feedback: Optional[Union[str, Dict[str, Any]]] = None
    current_target_metric: Optional[str] = None
    performance_summary: Optional[str] = None

class InterviewEndRequest(BaseModel):
    """End interview using interview_id."""
    interview_id: str
    final_evaluation: Optional[str] = None

class InterviewEndResponse(BaseModel):
    """Response for interview_id based end."""
    interview_id: str
    status: str = "completed"
    final_evaluation: Optional[str] = None
    final_report: Optional[Dict[str, Any]] = None
    message: str = "Interview completed successfully"

