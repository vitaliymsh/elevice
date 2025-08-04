from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TechnicalSpeechMetrics(BaseModel):
    speaking_rate_wpm: float
    speech_pace_consistency: float
    filler_word_count: int
    filler_word_percentage: float
    pause_analysis: Dict[str, float]
    vocabulary_richness_score: float
    unique_word_count: int
    repeated_phrase_count: int
    action_verb_count: int
    technical_term_usage: int
    star_adherence_score: float
    response_organization_score: float
    clarity_score: float
    conciseness_score: float
    confidence_indicators: Dict[str, int]
    engagement_score: float
    professional_tone_score: float
