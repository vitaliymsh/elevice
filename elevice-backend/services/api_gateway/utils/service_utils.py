"""
================================================================================
                           API GATEWAY UTILITIES
================================================================================

Utility functions for service communication, validation, and error handling.
"""

import httpx
from fastapi import HTTPException, UploadFile
from typing import Dict, Any
import logging

from config import SERVICE_URLS, ALLOWED_AUDIO_TYPES

logger = logging.getLogger(__name__)

# ================================================================================
# SERVICE COMMUNICATION
# ================================================================================

async def make_service_request(
    service_name: str, 
    endpoint: str, 
    client: httpx.AsyncClient,
    timeout: float = None, # Add timeout parameter
    **kwargs
) -> httpx.Response:
    """
    Make a request to a microservice with consistent error handling.
    
    Args:
        service_name: Name of the target service (must exist in SERVICE_URLS)
        endpoint: API endpoint path on the target service
        client: HTTP client instance for making the request
        **kwargs: Additional arguments passed to the HTTP request
    
    Returns:
        httpx.Response: The response from the target service
        
    Raises:
        HTTPException: When the service request fails
    """
    service_url = SERVICE_URLS[service_name]
    full_url = f"{service_url}/{endpoint}"
    
    try:
        logger.info(f"Forwarding request to {service_name} service: {full_url}")
        # Pass timeout to the request if provided
        response = await client.post(full_url, timeout=timeout, **kwargs) if timeout else await client.post(full_url, **kwargs)
        response.raise_for_status()
        return response
    except httpx.HTTPStatusError as e:
        error_detail = getattr(e.response, 'text', str(e))
        logger.error(f"Error from {service_name} service: {error_detail}")
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=f"{service_name.title()} service error: {error_detail}"
        )
    except httpx.RequestError as e:
        logger.error(f"Failed to communicate with {service_name} service: {e}")
        raise HTTPException(
            status_code=503, 
            detail=f"Failed to reach {service_name} service: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Internal server error with {service_name} service: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

# ================================================================================
# VALIDATION FUNCTIONS
# ================================================================================

def validate_audio_file(audio: UploadFile) -> None:
    """
    Validate uploaded audio file format and requirements.
    
    Args:
        audio: Uploaded audio file to validate
        
    Raises:
        HTTPException: When file is invalid or unsupported format
    """
    if not audio:
        raise HTTPException(status_code=400, detail="No audio file provided.")
    
    if audio.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {audio.content_type}. "
                   f"Supported types: {ALLOWED_AUDIO_TYPES}"
        )

