"""
================================================================================
                           ENHANCED EVALUATION ENGINE
================================================================================

Advanced evaluation logic for technical speech analysis and per-message analysis.
Provides comprehensive metrics and detailed feedback for interview performance.
"""

import re
from typing import Dict, List, Any, Optional
from collections import Counter
import logging
import sys
import os

# Add parent directory to Python path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from shared.models import (
    TechnicalSpeechMetrics,
    TechnicalSpeechAnalysisResponse,
)
from llm_client import LLMClient

logger = logging.getLogger(__name__)

class Evaluator:
    """Enhanced evaluation engine with technical speech analysis and per-message analysis."""
    
    def __init__(self):
        self.llm_client = LLMClient()
        
        # Common filler words for detection
        self.filler_words = {
            'um', 'uh', 'ah', 'er', 'like', 'you know', 'so', 'actually', 
            'basically', 'literally', 'totally', 'really', 'very', 'just',
            'kind of', 'sort of', 'i mean', 'well'
        }
        
        # Action verbs for professional communication
        self.action_verbs = {
            'achieved', 'implemented', 'developed', 'created', 'designed', 
            'led', 'managed', 'coordinated', 'executed', 'delivered',
            'optimized', 'improved', 'resolved', 'analyzed', 'built',
            'established', 'initiated', 'streamlined', 'enhanced', 'drove'
        }
        
        # Technical terms (can be expanded based on domain)
        self.technical_terms = {
            'algorithm', 'database', 'api', 'framework', 'architecture',
            'scalability', 'performance', 'optimization', 'integration',
            'deployment', 'authentication', 'authorization', 'microservices'
        }

    async def analyze_technical_speech(self, interview_data: Dict[str, Any]) -> TechnicalSpeechAnalysisResponse:
        """
        Perform comprehensive technical speech analysis on entire interview.
        
        Args:
            interview_data: Complete interview data including all responses and metadata
            
        Returns:
            TechnicalSpeechAnalysisResponse with detailed metrics and recommendations
        """
        logger.info(f"Starting technical speech analysis for interview {interview_data.get('interview_id')}")
        
        # Extract all user responses from interview
        all_responses = self._extract_user_responses(interview_data)
        combined_text = " ".join(all_responses)
        
        # Calculate technical speech metrics
        metrics = await self._calculate_technical_metrics(all_responses, interview_data)
        
        # Generate overall grade and recommendations using LLM
        llm_analysis = await self.llm_client._get_llm_speech_analysis(combined_text, metrics, interview_data)
        
        return TechnicalSpeechAnalysisResponse(
            interview_id=interview_data['interview_id'],
            total_duration_minutes=interview_data.get('total_duration_minutes', 0.0),
            total_word_count=len(combined_text.split()),
            metrics=metrics,
            overall_speech_grade=llm_analysis['grade'],
            key_recommendations=llm_analysis['recommendations']
        )

    # ================================================================================
    # TECHNICAL METRICS CALCULATION
    # ================================================================================

    async def _calculate_technical_metrics(
        self, 
        responses: List[str], 
        interview_data: Dict[str, Any]
    ) -> TechnicalSpeechMetrics:
        """Calculate comprehensive technical speech metrics."""
        
        combined_text = " ".join(responses)
        words = combined_text.split()


        total_words = len(responses[-1])
        total_duration = interview_data.get('total_duration_minutes', 1.0)  # Convert to seconds

        speaking_rate_wpm = int(float(total_words) / float(total_duration))
        
        # Filler word analysis
        filler_count = self._count_filler_words(combined_text)
        filler_percentage = (filler_count / total_words * 100) if total_words > 0 else 0
        
        # Vocabulary analysis
        unique_words = len(set(word.lower() for word in words))
        vocabulary_richness = (unique_words / total_words * 100) if total_words > 0 else 0
        
        # Action verb and technical term analysis
        action_verb_count = self._count_action_verbs(combined_text)
        technical_term_count = self._count_technical_terms(combined_text)
        
        # Use LLM for complex analysis
        llm_metrics = await self.llm_client._get_llm_technical_metrics(responses, interview_data)
        
        return TechnicalSpeechMetrics(
            speaking_rate_wpm=speaking_rate_wpm,
            speech_pace_consistency=llm_metrics.get('pace_consistency', 85.0),
            filler_word_count=filler_count,
            filler_word_percentage=filler_percentage,
            pause_analysis=llm_metrics.get('pause_analysis', {}),
            vocabulary_richness_score=min(vocabulary_richness, 100.0),
            unique_word_count=unique_words,
            repeated_phrase_count=llm_metrics.get('repeated_phrases', 0),
            action_verb_count=action_verb_count,
            technical_term_usage=technical_term_count,
            star_adherence_score=llm_metrics.get('star_score', 75.0),
            response_organization_score=llm_metrics.get('organization_score', 80.0),
            clarity_score=llm_metrics.get('clarity_score', 85.0),
            conciseness_score=llm_metrics.get('conciseness_score', 80.0),
            confidence_indicators=llm_metrics.get('confidence_indicators', {}),
            engagement_score=llm_metrics.get('engagement_score', 85.0),
            professional_tone_score=llm_metrics.get('professional_tone', 90.0)
        )


    # ===============================================================================
    # MESSAGE METRICS CALCULATION
    # ===============================================================================

    def _calculate_wpm(self, text: str, duration_minutes: float) -> float:

        combined_text = " ".join(text)
        words = combined_text.split()

        total_words = len(words)
        total_duration = duration_minutes / 60  # Convert to hours

        # Speaking rate analysis
        return (total_words / total_duration) if total_duration > 0 else 0
    
    # ================================================================================
    # HELPER METHODS
    # ================================================================================

    def _extract_user_responses(self, interview_data: Dict[str, Any]) -> List[str]:
        """Extract all user responses from interview data."""
        responses = []
        
        # Check if we have pre-extracted user_responses
        if 'user_responses' in interview_data:
            return interview_data['user_responses']
        
        # Fallback to extracting from conversation_history
        conversation_history = interview_data.get('conversation_history', [])
        
        for item in conversation_history:
            # Handle different data structures
            if item.get('role') == 'user' or item.get('speaker') == 'user':
                responses.append(item.get('content', item.get('text', '')))
            elif item.get('speaker') == 'candidate':
                responses.append(item.get('text', item.get('answer', '')))
            elif 'answer' in item:  # Q&A pair format
                responses.append(item.get('answer', ''))
        
        return responses


    # TODO: Refactor filler word counter using an LLM for improved accuracy.
    # 1. Define a detailed prompt string to instruct the LLM on its role as a linguistic expert.
    # 2. Implement a function to call an LLM API, passing the transcript and prompt.
    # 3. Use the 'json' module to safely parse the LLM's structured output.
    # 4. Process the parsed data into a Python dictionary to generate personalized feedback metrics and a summary.
    def _count_filler_words(self, text: str) -> int:
        """Count filler words in text."""
        text_lower = text.lower()
        count = 0
        for filler in self.filler_words:
            count += len(re.findall(r'\b' + re.escape(filler) + r'\b', text_lower))
        return count

    def _count_action_verbs(self, text: str) -> int:
        """Count action verbs in text."""
        text_lower = text.lower()
        count = 0
        for verb in self.action_verbs:
            count += len(re.findall(r'\b' + re.escape(verb) + r'\b', text_lower))
        return count

    def _count_technical_terms(self, text: str) -> int:
        """Count technical terms in text."""
        text_lower = text.lower()
        count = 0
        for term in self.technical_terms:
            count += len(re.findall(r'\b' + re.escape(term) + r'\b', text_lower))
        return count

