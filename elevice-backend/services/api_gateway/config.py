"""
================================================================================
                           API GATEWAY CONFIGURATION
================================================================================

Configuration settings and constants for the Elevice API Gateway.
Manages environment variables, service URLs, and application settings.
"""

import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../../.env")

# ================================================================================
# LOGGING CONFIGURATION
# ================================================================================

def setup_logging():
    """Configure logging for the API Gateway."""
    logging.basicConfig(
        level=logging.INFO, 
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    return logging.getLogger(__name__)

# ================================================================================
# CONSTANTS
# ================================================================================

# Audio file validation constants
ALLOWED_AUDIO_TYPES = [
    "audio/wav", 
    "audio/x-wav", 
    "audio/webm", 
    "audio/mpeg", 
    "audio/flac"
]

# Public endpoints that don't require authentication
PUBLIC_ENDPOINTS = [
    "/", 
    "/docs", 
    "/openapi.json", 
    "/health",
    "/transcribe",
    "/evaluate", 
    "/synthesize",
    "/generate_questions",
    "/auto_answer",
    "/v3/interview/start",
    "/v3/interview/turn", 
    "/v3/interview/summary"
]

# ================================================================================
# SERVICE URLS
# ================================================================================

# Microservice URLs configuration
SERVICE_URLS = {
    "transcription": os.getenv("TRANSCRIPTION_SERVICE_URL", "http://transcription_service:8001"),
    "evaluation": os.getenv("EVALUATION_SERVICE_URL", "http://evaluation_service:8002"),
    "tts": os.getenv("TTS_SERVICE_URL", "http://tts_service:8003"),
    "interview": os.getenv("INTERVIEW_SERVICE_URL", "http://interview_service:8004"),
    "interview_v2": os.getenv("INTERVIEW_SERVICE_V2_URL", "http://interview_service:8004")
}

# ================================================================================
# APPLICATION SETTINGS
# ================================================================================



class Settings:
    """Application settings and configuration."""
    
    # FastAPI settings
    TITLE = "Elevice API Gateway"
    VERSION = "2.0.0" 
    DESCRIPTION = "Centralized gateway for Elevice microservices architecture"
    
    # CORS settings
    CORS_ORIGINS = [
        "https://v0-elevice.vercel.app",
        "http://localhost:3000"
    ]
    CORS_CREDENTIALS = True
    CORS_METHODS = ["*"]
    CORS_HEADERS = ["*"]
    
    # Request timeout settings
    DEFAULT_TIMEOUT = 30
    TRANSCRIPTION_TIMEOUT = 120.0 # Longer timeout for transcription processing
    TTS_TIMEOUT = None  # No timeout for streaming
    INTERVIEW_TIMEOUT = 60  # Longer timeout for interview processing
    EVALUATION_TIMEOUT = 60.0  # Timeout for evaluation processing
    
    @classmethod
    def get_service_url(cls, service_name: str) -> str:
        """Get URL for a specific service."""
        return SERVICE_URLS.get(service_name)
    
    @classmethod
    def is_public_endpoint(cls, path: str) -> bool:
        """Check if an endpoint is public (no auth required)."""
        return path in PUBLIC_ENDPOINTS

# Create settings instance
settings = Settings()
