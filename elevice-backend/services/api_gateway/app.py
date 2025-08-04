"""
================================================================================
                           ELEVICE API GATEWAY
================================================================================

A modular, centralized API gateway that routes requests to various microservices.

Architecture:
- Modular design with separated concerns
- Router-based endpoint organization  
- Centralized authentication and utilities
- Comprehensive error handling and logging

Services:
- Transcription Service (Audio → Text)
- Evaluation Service (Performance Analysis)  
- TTS Service (Text → Audio)
- Interview Service 
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import configuration and setup
from config import settings, setup_logging, SERVICE_URLS
from shared.supabase_client import get_supabase_client

# Import route modules
from routes import core_services, interview_services

# Setup logging
logger = setup_logging()

# ================================================================================
# FASTAPI APPLICATION SETUP
# ================================================================================

# Initialize FastAPI app with enhanced configuration
app = FastAPI(
    title=settings.TITLE,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# ================================================================================
# APPLICATION LIFECYCLE EVENTS
# ================================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services and validate connections on startup."""
    try:
        # Test database connection
        supabase = get_supabase_client()
        logger.info("✅ API Gateway initialized with database connection")
        logger.info(f"🔗 Connected to {len(SERVICE_URLS)} microservices")
        for service_name, url in SERVICE_URLS.items():
            logger.info(f"   - {service_name}: {url}")
        logger.info(f"📚 Documentation available at /docs")
    except Exception as e:
        logger.error(f"❌ Failed to initialize API Gateway: {e}")
        raise

# ================================================================================
# HEALTH CHECK ENDPOINT
# ================================================================================

@app.get("/")
async def read_root():
    """
    Gateway health check and service discovery endpoint.
    
    Returns basic information about the gateway and connected services.
    """
    return {
        "message": "Elevice API Gateway", 
        "status": "healthy",
        "version": settings.VERSION,
        "services": list(SERVICE_URLS.keys()),
        "description": settings.DESCRIPTION,
        "endpoints": {
            "health": "/",
            "docs": "/docs",
            "core_services": [
                "transcribe", 
                "evaluate", 
                "technical-speech-analysis", 
                "message-analysis", 
                "synthesize", 
                "generate_questions", 
                "auto_answer"
            ],
            "unified_interview": [
                "interview/start", 
                "interview/{id}/turn", 
                "interview/{id}/summary",
                "interview/history"
            ]
        }
    }

# ================================================================================
# ROUTE REGISTRATION
# ================================================================================

# Register core service routes (transcription, evaluation, TTS, legacy interview)
app.include_router(core_services.router, tags=["Core Services"])

# Include unified interview routes (V2 + V3 integration)
app.include_router(interview_services.router, tags=["Unified Interview"])
