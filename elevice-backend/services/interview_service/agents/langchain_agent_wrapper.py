"""
LangChain Agent Wrapper
=======================

Wrapper implementation that adapts the existing LangChain-based agent
to conform to the unified InterviewAgentInterface.
"""

import logging
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime

from agent_interface import (
    InterviewAgentInterface, 
    InterviewStartResponse, 
    InterviewTurnResponse
)
try:
    from langchain_agent.agent_core import InterviewAgent
    from shared.models import InterviewState, WeightedMetric
except ImportError as e:
    # These will be available in Docker
    logger.warning(f"Import warning (expected in local dev): {e}")
    InterviewAgent = None
    InterviewState = None
    WeightedMetric = None

logger = logging.getLogger(__name__)

class LangChainAgentWrapper(InterviewAgentInterface):
    """
    Wrapper for the existing LangChain-based interview agent.
    
    This wrapper adapts the agent_core.InterviewAgent to the unified interface,
    providing consistency and fallback capabilities.
    """
    
    def __init__(self, llm_client=None, database_manager=None):
        super().__init__(llm_client, database_manager)
        
        try:
            self.core_agent = InterviewAgent()
            self._available = True
            logger.info("LangChain Agent wrapper initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LangChain Agent: {e}")
            self.core_agent = None
            self._available = False
    
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
        """Start interview using LangChain agent."""
        try:
            if not self.is_available():
                raise RuntimeError("LangChain agent is not available")
            
            # Convert weighted_metrics if provided
            converted_metrics = None
            if weighted_metrics:
                converted_metrics = [
                    WeightedMetric(
                        metric_name=m.get("metric_name", "technical_acumen"),
                        weight=m.get("weight", 0.25),
                        target_threshold=m.get("target_threshold", 70.0)
                    ) for m in weighted_metrics
                ]
            
            # Initialize interview state using core agent
            interview_state = self.core_agent.initialize_interview_state(
                interview_type=interview_type,
                job_description=job_description,
                interviewer_persona=interviewer_persona,
                weighted_metrics=converted_metrics,
                max_questions=max_questions,
                historical_context=historical_context or []
            )
            
            # Set interview_id if provided
            if interview_id:
                interview_state.database_interview_id = interview_id
            
            # Store session
            session_id = interview_state.session_id
            self.active_sessions[session_id] = interview_state
            
            logger.info(f"LangChain agent started interview: {session_id}")
            
            return InterviewStartResponse(
                session_id=session_id,
                first_question=interview_state.current_question,
                interview_state=interview_state,
                agent_metadata={
                    "agent_type": "langchain_agent",
                    "core_agent_version": "3.0",
                    "features": ["weighted_metrics", "adaptive_questioning", "real_time_feedback"]
                }
            )
            
        except Exception as e:
            logger.error(f"Error starting LangChain interview: {e}")
            raise
    
    async def process_turn(
        self,
        session_id: str,
        candidate_answer: str,
        duration_seconds: Optional[float] = None
    ) -> InterviewTurnResponse:
        """Process interview turn using LangChain agent."""
        try:
            if not self.is_available():
                raise RuntimeError("LangChain agent is not available")
            
            if session_id not in self.active_sessions:
                raise ValueError(f"Session {session_id} not found")
            
            current_state = self.active_sessions[session_id]
            
            # Process turn using core agent
            updated_state = self.core_agent.process_interview_turn(
                state=current_state,
                candidate_answer=candidate_answer,
                duration_seconds=duration_seconds
            )
            
            # Update stored session
            self.active_sessions[session_id] = updated_state
            
            # Prepare response
            next_question = None if updated_state.interview_complete else updated_state.current_question
            
            # Generate performance summary if interview complete
            performance_summary = None
            if updated_state.interview_complete:
                performance_summary = updated_state.overall_performance_summary
            
            logger.info(f"LangChain agent processed turn: {session_id}, complete: {updated_state.interview_complete}")
            
            return InterviewTurnResponse(
                session_id=session_id,
                next_question=next_question,
                interview_complete=updated_state.interview_complete,
                interview_state=updated_state,
                real_time_feedback=updated_state.real_time_feedback,
                performance_summary=performance_summary,
                agent_metadata={
                    "agent_type": "langchain_agent",
                    "question_count": updated_state.question_count,
                    "average_score": updated_state.average_score,
                    "completion_reason": getattr(updated_state, 'completion_reason', None)
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing LangChain turn: {e}")
            raise
    
    async def end_interview(
        self,
        session_id: str,
        reason: str = "manual_end"
    ) -> Dict[str, Any]:
        """End interview using LangChain agent."""
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Session {session_id} not found")
            
            current_state = self.active_sessions[session_id]
            
            # Mark as complete
            current_state.interview_complete = True
            current_state.completion_reason = reason
            
            # Generate final summary if not already done
            if not hasattr(current_state, 'overall_performance_summary') or not current_state.overall_performance_summary:
                current_state.overall_performance_summary = self.core_agent._generate_final_summary(current_state)
            
            # Prepare final response
            final_response = {
                "session_id": session_id,
                "interview_complete": True,
                "completion_reason": reason,
                "question_count": current_state.question_count,
                "average_score": current_state.average_score,
                "overall_performance_summary": current_state.overall_performance_summary,
                "final_metrics": current_state.flat_scores if hasattr(current_state, 'flat_scores') else {},
                "conversation_history": [
                    {
                        "question": qa.question,
                        "answer": qa.answer,
                        "score": qa.score,
                        "timestamp": qa.timestamp,
                        "feedback": qa.feedback
                    } for qa in current_state.conversation_history
                ],
                "agent_metadata": {
                    "agent_type": "langchain_agent",
                    "total_reasoning_steps": len(getattr(current_state, 'reasoning_trace', [])),
                    "metric_performance": {
                        metric.metric_name: metric.current_score 
                        for metric in current_state.weighted_metrics 
                        if metric.current_score is not None
                    }
                }
            }
            
            # Clean up session
            self.cleanup_session(session_id)
            
            logger.info(f"LangChain agent ended interview: {session_id}, reason: {reason}")
            return final_response
            
        except Exception as e:
            logger.error(f"Error ending LangChain interview: {e}")
            raise
    
    def get_session_state(self, session_id: str) -> Optional[InterviewState]:
        """Get current session state."""
        return self.active_sessions.get(session_id)
    
    def is_available(self) -> bool:
        """Check if LangChain agent is available."""
        return self._available and self.core_agent is not None
    
    def get_capabilities(self) -> List[str]:
        """Get LangChain agent capabilities."""
        base_capabilities = super().get_capabilities()
        langchain_capabilities = [
            "weighted_metric_targeting",
            "granular_scoring",
            "adaptive_questioning",
            "persona_based_interviews",
            "comprehensive_feedback",
            "performance_analytics",
            "multi_stage_interviews",
            "historical_context_integration"
        ]
        return base_capabilities + langchain_capabilities
    
    def get_agent_info(self) -> Dict[str, Any]:
        """Get detailed agent information."""
        base_info = super().get_agent_info()
        langchain_info = {
            "implementation": "LangChain-based agent with weighted metrics",
            "version": "3.0",
            "core_features": [
                "ReAct pattern scoring",
                "Granular justifications", 
                "Probabilistic weakness targeting",
                "Multi-persona support",
                "Comprehensive completion logic"
            ],
            "supported_metrics": [
                "technical_acumen",
                "problem_solving", 
                "communication",
                "experience_relevance",
                "system_design",
                "coding_skills",
                "leadership"
            ],
            "supported_personas": [
                "Skeptical Senior Engineer",
                "Friendly HR Manager",
                "Laid-back Founder", 
                "Technical Lead",
                "Standard Technical Interviewer"
            ]
        }
        
        return {**base_info, **langchain_info}