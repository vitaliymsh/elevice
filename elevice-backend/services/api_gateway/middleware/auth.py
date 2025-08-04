"""
================================================================================
                           AUTHENTICATION MIDDLEWARE
================================================================================

Authentication and security middleware for the API Gateway.
Handles user authentication, session validation, and request authorization.
"""

import json
import logging
from fastapi import HTTPException, Request
from typing import Optional

from shared.supabase_client import get_supabase_client
from config import PUBLIC_ENDPOINTS

logger = logging.getLogger(__name__)

# ================================================================================
# AUTHENTICATION FUNCTIONS
# ================================================================================

async def authenticate_user(request: Request) -> Optional[str]:
    """
    Dependency to authenticate user for protected endpoints.
    
    Args:
        request: FastAPI request object
        
    Returns:
        str: Authenticated user ID, or None for public endpoints
        
    Raises:
        HTTPException: When authentication fails
    """
    # Check if endpoint is public (doesn't require authentication)
    if request.url.path in PUBLIC_ENDPOINTS:
        return None
    
    # Extract user_id from various sources
    user_id = await extract_user_id(request)
    
    if not user_id:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required: user_id must be provided in query params, X-User-ID header, or request body"
        )
    
    # Validate user session
    await validate_user_session(user_id)
    
    logger.info(f"User {user_id[:8]}... authenticated successfully")
    return user_id

async def extract_user_id(request: Request) -> Optional[str]:
    """
    Extract user_id from various request sources.
    
    Args:
        request: FastAPI request object
        
    Returns:
        str: User ID if found, None otherwise
    """
    user_id = None
    
    # Try to get user_id from query parameters
    user_id = request.query_params.get('user_id')
    
    # Try to get user_id from headers
    if not user_id:
        user_id = request.headers.get('X-User-ID')
    
    # Try to get user_id from request body for POST requests
    if not user_id:
        try:
            body_bytes = await request.body()
            if body_bytes:
                body = json.loads(body_bytes)
                user_id = body.get('user_id')
                request._json_body = body  # Cache for later use
            else:
                request._json_body = {}
        except:
            request._json_body = {}
    
    return user_id

async def validate_user_session(user_id: str) -> None:
    """
    Validate user session against the database.
    
    Args:
        user_id: User ID to validate
        
    Raises:
        HTTPException: When session validation fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table('user_sessions').select('user_id').eq('user_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=401, 
                detail="Invalid user session: user_id not found in active sessions"
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Authentication service error"
        )

# ================================================================================
# MIDDLEWARE FUNCTIONS
# ================================================================================

def is_authenticated_endpoint(path: str) -> bool:
    """
    Check if an endpoint requires authentication.
    
    Args:
        path: Request path
        
    Returns:
        bool: True if authentication is required
    """
    return path not in PUBLIC_ENDPOINTS

def extract_user_from_request_sync(request: Request) -> Optional[str]:
    """
    Synchronously extract user ID from request (for logging/monitoring).
    
    Args:
        request: FastAPI request object
        
    Returns:
        str: User ID if found in headers or query params
    """
    # Try query params first
    user_id = request.query_params.get('user_id')
    
    # Try headers
    if not user_id:
        user_id = request.headers.get('X-User-ID')
    
    return user_id
