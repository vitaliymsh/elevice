"""
================================================================================
                     CLEAN INTERVIEW ROUTES
================================================================================

Clean interview routes using the interview_id-based approach.
This provides a streamlined API focused on the core interview functionality.

Available Endpoints:
- POST /interview_id/start: Start/resume interview using existing interview_id
- POST /interview_id/process_turn: Process candidate responses and get next questions  
- POST /interview_id/end: End interview and mark as completed in database

Features:
- Interview ID Based: Uses interview_id as the primary identifier
- Database Driven: All state reconstructed from database records
- Intelligent Agent: LangChain-based agent with adaptive questioning
- Real-time Feedback: Performance analysis and improvement suggestions
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
import logging
import sys
import os

# Add parent directory to Python path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.models import (
    # Interview ID Models
    InterviewStartRequest, InterviewStartResponse,
    InterviewTurnRequest, InterviewTurnResponse,
    InterviewEndRequest, InterviewEndResponse
)
from middleware.auth import authenticate_user
from utils.service_utils import make_service_request

logger = logging.getLogger(__name__)

# Create router for clean interview services
router = APIRouter(prefix="/interview", tags=["Interview Service"])

# ================================================================================
# INTERVIEW ROUTES
# ================================================================================

@router.post("/interview_id/start", response_model=InterviewStartResponse)
async def start_interview_by_id(
    request: InterviewStartRequest,
    user_id: str = Depends(authenticate_user)
):
    """Start or resume interview using existing interview_id and user_id only."""
    try:
        logger.info(f"InterviewID: Starting interview with ID {request.interview_id} for user {user_id[:8]}...")
        
        # Forward request to clean interview service with longer timeout for initialization
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await make_service_request(
                service_name="interview",
                endpoint="interview_id/start",
                client=client,
                json=request.model_dump()
            )
            result = response.json()
            
            logger.info(f"InterviewID: Interview started with existing ID {request.interview_id}")
            return result
            
    except Exception as e:
        logger.error(f"InterviewID: Error starting interview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")


@router.post("/interview_id/process_turn", response_model=InterviewTurnResponse)
async def process_interview_turn_by_id(
    request: InterviewTurnRequest,
    user_id: str = Depends(authenticate_user)
):
    """Process interview turn using interview_id approach with clean service."""
    try:
        logger.info(f"InterviewID: Processing turn for interview {request.interview_id[:8]}... for user {user_id[:8]}...")
        
        # Forward request to clean interview service with longer timeout
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await make_service_request(
                service_name="interview",
                endpoint="interview_id/process_turn",
                client=client,
                json=request.model_dump()
            )
            result = response.json()
            
            logger.info(f"InterviewID: Turn processed for interview {request.interview_id[:8]}...")
            return result
            
    except Exception as e:
        logger.info(f"InterviewID: Error processing turn: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process turn: {str(e)}")

@router.post("/interview_id/end", response_model=InterviewEndResponse)
async def end_interview_by_id(
    request: InterviewEndRequest,
    user_id: str = Depends(authenticate_user)
):
    """End interview using interview_id approach with clean service."""
    try:
        logger.info(f"InterviewID: Ending interview {request.interview_id[:8]}... for user {user_id[:8]}...")
        
        # Forward request to clean interview service with longer timeout
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await make_service_request(
                service_name="interview",
                endpoint="interview_id/end",
                client=client,
                json=request.model_dump()
            )
            result = response.json()
            
            logger.info(f"InterviewID: Interview {request.interview_id[:8]}... ended successfully")
            return result
            
    except Exception as e:
        logger.error(f"InterviewID: Error ending interview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to end interview: {str(e)}")
