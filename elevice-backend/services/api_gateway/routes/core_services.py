"""
================================================================================
                           CORE SERVICE ROUTES
================================================================================

Routes for core microservices: Transcription, Evaluation, TTS, and Legacy Interview.
These are the foundational services that don't require authentication.
"""

import httpx
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import logging
import sys
import os

# Add parent directory to Python path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.models import (
    TranscriptionResponse,
    TechnicalSpeechAnalysisRequest,
    TechnicalSpeechAnalysisResponse,
    TTSRequest,
    AutoAnswerRequest,
    AutoAnswerResponse
)
from utils.service_utils import make_service_request, validate_audio_file
from config import SERVICE_URLS, settings

logger = logging.getLogger(__name__)

# Create router for core services
router = APIRouter()

# ================================================================================
# TRANSCRIPTION SERVICE
# ================================================================================

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Audio transcription endpoint.
    
    Converts uploaded audio files to text using the transcription microservice.
    Supports: WAV, WEBM, MP3, FLAC formats.
    """
    validate_audio_file(audio)
    
    async with httpx.AsyncClient() as client:
        files = {"audio": (audio.filename, await audio.read(), audio.content_type)}
        response = await make_service_request(
            service_name="transcription",
            endpoint="transcribe", 
            client=client,
            timeout=settings.TRANSCRIPTION_TIMEOUT, # Use the new timeout
            files=files
        )
        return response.json()

# ================================================================================
# EVALUATION SERVICE
# ================================================================================

@router.post("/technical-speech-analysis", response_model=TechnicalSpeechAnalysisResponse)
async def analyze_technical_speech(request: TechnicalSpeechAnalysisRequest):
    """
    Comprehensive technical speech analysis for entire interview.
    
    Analyzes speaking patterns, vocabulary usage, structure quality, and 
    communication effectiveness based on complete interview data.
    """
    async with httpx.AsyncClient() as client:
        response = await make_service_request(
            service_name="evaluation",
            endpoint="technical-speech-analysis",
            client=client,
            timeout=settings.EVALUATION_TIMEOUT,
            json=request.model_dump()
        )
        return response.json()

# ================================================================================
# TEXT-TO-SPEECH SERVICE
# ================================================================================

@router.post("/synthesize", response_class=StreamingResponse)
async def synthesize_text(request: TTSRequest):
    """
    Text-to-speech synthesis endpoint.
    
    Converts text to audio using the TTS microservice and streams the response.
    """
    
    async def audio_stream_generator() -> AsyncGenerator[bytes, None]:
        """Generate streaming audio response from TTS service."""
        service_url = SERVICE_URLS["tts"]
        full_url = f"{service_url}/synthesize"
        
        try:
            logger.info(f"Forwarding TTS request to {full_url}")
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    full_url,
                    json=request.model_dump(),
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes():
                        yield chunk
                        
        except httpx.HTTPStatusError as e:
            logger.error(f"Error from TTS service: {e}")
            from fastapi import HTTPException
            raise HTTPException(
                status_code=e.response.status_code, 
                detail=f"TTS service error: {str(e)}"
            )
        except httpx.RequestError as e:
            logger.error(f"Failed to communicate with TTS service: {e}")
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503, 
                detail=f"Failed to reach TTS service: {str(e)}"
            )
        except Exception as e:
            logger.error(f"TTS proxy error: {e}")
            from fastapi import HTTPException
            raise HTTPException(
                status_code=500, 
                detail=f"TTS proxy error: {str(e)}"
            )

    return StreamingResponse(
        content=audio_stream_generator(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"}
    )

# ================================================================================
# AUTO INTERVIEW SERVICE
# ================================================================================

@router.post("/auto_answer", response_model=AutoAnswerResponse)
async def auto_answer(request: AutoAnswerRequest):
    """
    Automated candidate response generation endpoint.
    
    Generates realistic candidate responses using LLM for testing and demo purposes.
    """
    async with httpx.AsyncClient() as client:
        response = await make_service_request(
            service_name="interview",
            endpoint="auto_answer",
            client=client,
            json=request.model_dump()
        )
        return response.json()
