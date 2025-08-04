import google.generativeai as genai
import os
import json
import logging
from typing import List, Dict, Any
import re

from shared.models import TechnicalSpeechMetrics

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set.")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Common filler words for detection
        self.filler_words = {
            'um', 'uh', 'ah', 'er', 'like', 'you know', 'so', 'well', 
            'basically', 'actually', 'literally', 'kind of', 'sort of'
        }
        
        # Common action verbs for technical interviews
        self.action_verbs = {
            'implemented', 'designed', 'developed', 'created', 'built', 'managed',
            'led', 'optimized', 'improved', 'reduced', 'increased', 'solved',
            'analyzed', 'researched', 'configured', 'deployed', 'tested',
            'debugged', 'refactored', 'migrated', 'integrated', 'automated',
            'collaborated', 'coordinated', 'mentored', 'trained', 'presented',
            'architected', 'scaled', 'maintained', 'documented', 'reviewed'
        }

    
    
    async def _get_llm_technical_metrics(self, responses: List[str], interview_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use LLM to calculate complex technical metrics."""
        prompt = f"""
        Analyze these interview responses for technical speech metrics:
        
        Responses: {json.dumps(responses, indent=2)}
        Interview Type: {interview_data.get('interview_type', 'general')}
        
        Calculate and return as JSON:
        1. pace_consistency (0-100): How consistent was the speaking pace
        2. pause_analysis: {{"average_pause_duration": float, "excessive_pauses": int}}
        3. repeated_phrases (int): Count of unnecessarily repeated phrases
        4. star_score (0-100): STAR method adherence
        5. organization_score (0-100): Response organization quality
        6. clarity_score (0-100): Overall clarity
        7. conciseness_score (0-100): Conciseness vs verbosity
        8. confidence_indicators: {{"assertive_language": int, "hedging": int}}
        9. engagement_score (0-100): Interview engagement level
        10. professional_tone (0-100): Professional communication score
        """
        
        result = await self.generate_response(prompt)

        # Remove code fences and trailing non-JSON symbols
        match = re.search(r'\{[\s\S]*\}', result)
        if match:
            json_block = match.group(0)
        else:
            json_block = result.strip()
        try:
            return json.loads(json_block)
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM technical metrics response")
            return {}

    async def _get_llm_speech_analysis(
        self, 
        combined_text: str, 
        metrics: TechnicalSpeechMetrics, 
        interview_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get overall grade and recommendations from LLM."""
        prompt = f"""
        Provide overall assessment of this interview performance based on the technical metric:
        
        Combined Responses: "{combined_text}"
        
        Technical Metrics:
        - Speaking Rate: {metrics.speaking_rate_wpm} WPM
        - Filler Words: {metrics.filler_word_percentage}%
        - Vocabulary Richness: {metrics.vocabulary_richness_score}
        - Action Verbs: {metrics.action_verb_count}
        - STAR Adherence: {metrics.star_adherence_score}
        
        Provide:
        1. grade: One of "Excellent", "Good", "Fair", "Needs Improvement"
        2. recommendations: Array of 3-5 specific, actionable recommendations
        
        Return as JSON.
        """
        
        result = await self.generate_response(prompt)
        # Try to extract JSON from the LLM response robustly
        import re
        json_block = None
        # Try to find the first {...} block
        match = re.search(r'\{[\s\S]*\}', result)
        if match:
            json_block = match.group(0)
        else:
            json_block = result.strip()
        try:
            return json.loads(json_block)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM speech analysis response: {result}")
            return {
                "grade": "Fair",
                "recommendations": ["Continue practicing interview responses", "Focus on clarity and structure"]
            }



    async def generate_response(self, prompt: str) -> str:
        """
        Generic method to generate a response from the LLM.
        
        Args:
            prompt: The prompt to send to the LLM
            
        Returns:
            The LLM's response as a string
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return "{\"error\": \"Failed to generate response\"}"