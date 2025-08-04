"""
Unified Interview Agent Interface
=================================

This module provides a unified interface for all interview agent implementations,
making the system maintainable and allowing easy switching between different
agent types (LangChain-based, True Agent, etc.).
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import uuid
import logging

try:
    from shared.models import InterviewState, QuestionAnswerPair
except ImportError:
    # Fallback for local development - these will be available in Docker
    InterviewState = None
    QuestionAnswerPair = None

logger = logging.getLogger(__name__)

@dataclass
class AgentResponse:
    """Standard response format for all agent operations."""
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None
    agent_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class InterviewStartResponse:
    """Response when starting an interview."""
    session_id: str
    first_question: str
    interview_state: InterviewState
    agent_metadata: Optional[Dict[str, Any]] = None

@dataclass
class InterviewTurnResponse:
    """Response when processing an interview turn."""
    session_id: str
    next_question: Optional[str]
    interview_complete: bool
    interview_state: InterviewState
    real_time_feedback: Optional[Any]
    performance_summary: Optional[str] = None
    agent_metadata: Optional[Dict[str, Any]] = None

class InterviewAgentInterface(ABC):
    """
    Abstract base class defining the unified interface for all interview agents.
    
    This interface ensures consistency across different agent implementations:
    - LangChain-based agent (langchain_agent/)
    - True Agent implementation (agent/)
    - Future agent implementations
    """
    
    def __init__(self, llm_client=None, database_manager=None):
        """Initialize the agent with required dependencies."""
        self.llm_client = llm_client
        self.database_manager = database_manager
        self.agent_type = self.__class__.__name__
        self.active_sessions = {}
        
    @abstractmethod
    async def start_interview(
        self,
        interview_type: str,
        job_description: Optional[str] = None,
        interviewer_persona: str = "Technical Interviewer",
        max_questions: int = 10,
        interview_id: Optional[str] = None,
        weighted_metrics: Optional[List] = None,
        historical_context: Optional[List[Dict[str, Any]]] = None
    ) -> InterviewStartResponse:
        """
        Start a new interview session.
        
        Args:
            interview_type: Type of interview (e.g., "Software Engineer")
            job_description: Optional job context
            interviewer_persona: Interviewer personality/style
            max_questions: Maximum questions before auto-completion
            interview_id: Optional interview ID for tracking
            weighted_metrics: Custom metric weights
            historical_context: Previous interviews for context
            
        Returns:
            InterviewStartResponse with session details and first question
        """
        pass
    
    @abstractmethod
    async def process_turn(
        self,
        session_id: str,
        candidate_answer: str,
        duration_seconds: Optional[float] = None
    ) -> InterviewTurnResponse:
        """
        Process a complete interview turn.
        
        Args:
            session_id: Interview session identifier
            candidate_answer: Candidate's response
            duration_seconds: Optional response timing
            
        Returns:
            InterviewTurnResponse with next question and feedback
        """
        pass
    
    @abstractmethod
    async def end_interview(
        self,
        session_id: str,
        reason: str = "manual_end"
    ) -> Dict[str, Any]:
        """
        End an interview session and generate final summary.
        
        Args:
            session_id: Interview session identifier
            reason: Reason for ending the interview
            
        Returns:
            Final interview summary and metrics
        """
        pass
    
    @abstractmethod
    def get_session_state(self, session_id: str) -> Optional[InterviewState]:
        """
        Get current state of an interview session.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Current InterviewState or None if not found
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the agent is available and properly initialized.
        
        Returns:
            True if agent is ready to handle interviews
        """
        pass
    
    def get_agent_info(self) -> Dict[str, Any]:
        """
        Get information about this agent implementation.
        
        Returns:
            Dict with agent metadata
        """
        return {
            "agent_type": self.agent_type,
            "capabilities": self.get_capabilities(),
            "active_sessions": len(self.active_sessions),
            "available": self.is_available()
        }
    
    def get_capabilities(self) -> List[str]:
        """
        Get list of agent capabilities.
        
        Returns:
            List of capability strings
        """
        return [
            "interview_management",
            "question_generation", 
            "answer_evaluation",
            "real_time_feedback"
        ]
    
    def cleanup_session(self, session_id: str) -> bool:
        """
        Clean up resources for a completed session.
        
        Args:
            session_id: Session to clean up
            
        Returns:
            True if cleanup successful
        """
        try:
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
                logger.info(f"Cleaned up session {session_id} for {self.agent_type}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error cleaning up session {session_id}: {e}")
            return False

class AgentManager:
    """
    Manager class for handling multiple agent implementations with fallbacks.
    
    This class provides intelligent agent selection and fallback mechanisms,
    ensuring robust interview functionality even if specific agents fail.
    """
    
    def __init__(self):
        self.agents: Dict[str, InterviewAgentInterface] = {}
        self.primary_agent: Optional[str] = None
        self.fallback_agents: List[str] = []
        
    def register_agent(
        self, 
        name: str, 
        agent: InterviewAgentInterface, 
        is_primary: bool = False
    ) -> None:
        """
        Register an agent implementation.
        
        Args:
            name: Agent identifier
            agent: Agent implementation
            is_primary: Whether this should be the primary agent
        """
        self.agents[name] = agent
        
        if is_primary or not self.primary_agent:
            self.primary_agent = name
            
        if name not in self.fallback_agents:
            self.fallback_agents.append(name)
            
        logger.info(f"Registered agent: {name} (primary: {is_primary})")
    
    def get_available_agent(self) -> Optional[InterviewAgentInterface]:
        """
        Get the best available agent, using fallback logic.
        
        Returns:
            Available agent or None if none available
        """
        # Try primary agent first
        if self.primary_agent and self.primary_agent in self.agents:
            primary = self.agents[self.primary_agent]
            if primary.is_available():
                return primary
            
        # Try fallback agents
        for agent_name in self.fallback_agents:
            if agent_name in self.agents:
                agent = self.agents[agent_name]
                if agent.is_available():
                    logger.info(f"Using fallback agent: {agent_name}")
                    return agent
                    
        logger.error("No available agents found")
        return None
    
    def get_agent_by_name(self, name: str) -> Optional[InterviewAgentInterface]:
        """Get specific agent by name."""
        return self.agents.get(name)
    
    def list_agents(self) -> Dict[str, Dict[str, Any]]:
        """List all registered agents with their status."""
        return {
            name: {
                "available": agent.is_available(),
                "info": agent.get_agent_info(),
                "is_primary": name == self.primary_agent
            }
            for name, agent in self.agents.items()
        }
    
    async def start_interview_with_fallback(self, **kwargs) -> AgentResponse:
        """
        Start interview with automatic fallback handling.
        
        Returns:
            Standardized AgentResponse
        """
        agent = self.get_available_agent()
        if not agent:
            return AgentResponse(
                success=False,
                data={},
                error="No available agents",
                agent_type=None
            )
        
        try:
            result = await agent.start_interview(**kwargs)
            return AgentResponse(
                success=True,
                data={
                    "session_id": result.session_id,
                    "first_question": result.first_question,
                    "interview_state": result.interview_state,
                },
                agent_type=agent.agent_type,
                metadata=result.agent_metadata
            )
        except Exception as e:
            logger.error(f"Error starting interview with {agent.agent_type}: {e}")
            return AgentResponse(
                success=False,
                data={},
                error=str(e),
                agent_type=agent.agent_type
            )
    
    async def process_turn_with_fallback(self, session_id: str, **kwargs) -> AgentResponse:
        """
        Process turn with automatic fallback handling and session recovery.
        
        Returns:
            Standardized AgentResponse
        """
        # Find which agent owns this session
        agent = None
        for agent_impl in self.agents.values():
            if session_id in agent_impl.active_sessions:
                agent = agent_impl
                break
        
        if not agent:
            # Session not found, try to recover from database
            agent = self.get_available_agent()
            if not agent:
                return AgentResponse(
                    success=False,
                    data={},
                    error="No available agents for session processing",
                    agent_type=None
                )
            
            # Attempt to recover session from database
            try:
                await self._recover_session_from_database(agent, session_id)
                logger.info(f"Successfully recovered session {session_id} for {agent.agent_type}")
            except Exception as e:
                logger.error(f"Failed to recover session {session_id}: {e}")
                return AgentResponse(
                    success=False,
                    data={},
                    error=f"Session {session_id} not found and could not be recovered: {str(e)}",
                    agent_type=agent.agent_type
                )
        
        try:
            result = await agent.process_turn(session_id=session_id, **kwargs)
            return AgentResponse(
                success=True,
                data={
                    "session_id": result.session_id,
                    "next_question": result.next_question,
                    "interview_complete": result.interview_complete,
                    "interview_state": result.interview_state,
                    "real_time_feedback": result.real_time_feedback,
                    "performance_summary": result.performance_summary
                },
                agent_type=agent.agent_type,
                metadata=result.agent_metadata
            )
        except Exception as e:
            logger.error(f"Error processing turn with {agent.agent_type}: {e}")
            return AgentResponse(
                success=False,
                data={},
                error=str(e),
                agent_type=agent.agent_type
            )

    async def _recover_session_from_database(self, agent: InterviewAgentInterface, session_id: str) -> None:
        """
        Recover a session from database using interview_id as session_id.
        
        Args:
            agent: The agent to recover the session for
            session_id: Session ID (which is actually the interview_id)
        """
        import uuid
        from database import DatabaseManager
        
        # Initialize database manager if agent doesn't have one
        if not agent.database_manager:
            agent.database_manager = DatabaseManager()
            await agent.database_manager.initialize()
        
        db = agent.database_manager
        
        try:
            # Parse interview_id from session_id
            interview_id = uuid.UUID(session_id)
            
            # Get interview details from database
            interview = await db.get_interview_by_id(interview_id)
            interview_params = await db.get_interview_parameters_by_id(interview_id)
            interview_turns = await db.get_interview_turns(interview_id)
            
            # Get job details if available
            job = None
            if interview.job_id:
                job = await db.get_job_by_id(interview.job_id)
            
            logger.info(f"Recovering session {session_id}: {len(interview_turns)} turns found")
            
            # Recreate the session using the agent's start_interview method
            # but with the recovered data
            await self._recreate_agent_session(
                agent=agent,
                session_id=session_id,
                interview=interview,
                interview_params=interview_params,
                interview_turns=interview_turns,
                job=job
            )
            
        except Exception as e:
            logger.error(f"Error recovering session {session_id} from database: {e}")
            raise
    
    async def _recreate_agent_session(
        self, 
        agent: InterviewAgentInterface, 
        session_id: str,
        interview,
        interview_params,
        interview_turns,
        job=None
    ) -> None:
        """
        Recreate the agent session with historical data.
        
        This method handles the agent-specific logic for recreating sessions
        based on their different internal structures.
        """
        try:
            # Start a new interview to create the session structure
            start_response = await agent.start_interview(
                interview_type=interview_params.interview_type,
                job_description=job.description if job else None,
                interviewer_persona=interview_params.interviewer_persona,
                max_questions=interview_params.max_questions,
                interview_id=session_id
            )
            
            # Get the created session
            if session_id not in agent.active_sessions:
                # The agent uses a different session_id, find the actual one
                actual_session_id = start_response.session_id
                if actual_session_id in agent.active_sessions:
                    # Move the session to use interview_id as key
                    agent.active_sessions[session_id] = agent.active_sessions[actual_session_id]
                    del agent.active_sessions[actual_session_id]
                else:
                    raise ValueError(f"Session creation failed for {agent.agent_type}")
            
            # Update session with historical turn data
            session_data = agent.active_sessions[session_id]
            
            # Reconstruct conversation from turns (turns are stored by speaker)
            conversation_pairs = []
            current_question = None
            
            for turn in sorted(interview_turns, key=lambda t: t.turn_index):
                if turn.speaker == 'AI':
                    current_question = turn.text
                elif turn.speaker == 'User' and current_question:
                    conversation_pairs.append({
                        'question': current_question,
                        'answer': turn.text,
                        'turn_index': turn.turn_index
                    })
                    current_question = None
            
            # Handle different agent types
            if hasattr(session_data, 'conversation_history'):
                # LangChain agent - update conversation history
                for pair in conversation_pairs:
                    session_data.conversation_history.append(pair)
                
                # Update question count and state
                if hasattr(session_data, 'current_question_number'):
                    session_data.current_question_number = len(conversation_pairs) + 1
                    
            elif isinstance(session_data, dict):
                # True agent or graph-based agent - update dictionary structure  
                if 'conversation_history' in session_data:
                    session_data['conversation_history'] = conversation_pairs
                
                if 'current_question_number' in session_data:
                    session_data['current_question_number'] = len(conversation_pairs) + 1
            
            logger.info(f"Recreated session {session_id} with {len(interview_turns)} historical turns")
            
        except Exception as e:
            logger.error(f"Error recreating session {session_id}: {e}")
            raise

# Global agent manager instance
agent_manager = AgentManager()