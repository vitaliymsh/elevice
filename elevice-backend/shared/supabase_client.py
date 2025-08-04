"""
Shared Supabase client configuration.
Provides a centralized Supabase client that can be imported by any service.
"""

import os
from supabase import create_client, Client
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SupabaseManager:
    """Centralized Supabase client manager."""
    
    _instance: Optional['SupabaseManager'] = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Supabase client with environment variables."""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_anon_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_anon_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. "
                "Please check your .env configuration."
            )
        
        try:
            self._client = create_client(supabase_url, supabase_anon_key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance."""
        if self._client is None:
            self._initialize_client()
        return self._client
    
    def test_connection(self) -> bool:
        """Test the database connection."""
        try:
            # Simple test query
            response = self.client.table("user_sessions").select("count", count="exact").execute()
            logger.info(f"Database connection test successful. Found {response.count} user sessions.")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False

# Global instance
_supabase_manager = None

def get_supabase_client() -> Client:
    """
    Get the shared Supabase client instance.
    
    Returns:
        Client: Supabase client instance
    
    Raises:
        ValueError: If Supabase credentials are not configured
    """
    global _supabase_manager
    
    if _supabase_manager is None:
        _supabase_manager = SupabaseManager()
    
    return _supabase_manager.client

def test_supabase_connection() -> bool:
    """
    Test the Supabase database connection.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    global _supabase_manager
    
    if _supabase_manager is None:
        _supabase_manager = SupabaseManager()
    
    return _supabase_manager.test_connection()

# Convenience functions for common operations
def get_table(table_name: str):
    """Get a table reference from Supabase."""
    return get_supabase_client().table(table_name)

def execute_rpc(function_name: str, parameters: dict = None):
    """Execute a Supabase RPC function."""
    return get_supabase_client().rpc(function_name, parameters or {})
