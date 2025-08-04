"""
Interview Agent Workflow (LangGraph-Style)
==========================================

This module creates a LangGraph-style workflow for the interview agent.
It defines a clean, readable workflow while preserving all functionality.
"""

import os
import logging
from typing import Dict, Any

from .langgraph_state import InterviewState, ActionType, create_initial_state
from .langgraph_nodes import InterviewNodes

logger = logging.getLogger(__name__)

class InterviewAgentGraph:
    """
    LangGraph-style Interview Agent with stateful workflow.
    
    This replaces the previous agent_core.py with a clean, readable
    implementation while preserving all functionality.
    """
    
    def __init__(self, google_api_key: str = None):
        """Initialize the interview agent graph."""
        self.google_api_key = google_api_key or os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("Google API key is required")
        
        # Initialize nodes
        self.nodes = InterviewNodes(self.google_api_key)
        
        # Store active sessions
        self.sessions = {}
        
        logger.info("LangGraph-style Interview Agent initialized")
    
    def _run_workflow(self, state: InterviewState, workflow_type: str) -> InterviewState:
        """Run the appropriate workflow based on type."""
        try:
            if workflow_type == "initialize":
                return self.nodes.initialize_interview(state)
            
            elif workflow_type == "process_turn":
                # Extract candidate answer from state
                candidate_answer = state.get("_candidate_answer")
                duration_seconds = state.get("_duration_seconds")
                
                if not candidate_answer:
                    raise ValueError("No candidate answer provided")
                
                # Process candidate answer
                state = self.nodes.process_candidate_answer(state, candidate_answer, duration_seconds)
                
                # Score the answer
                state = self.nodes.score_answer(state)
                
                # Generate feedback
                state = self.nodes.generate_feedback(state)
                
                # Check if interview should end
                state = self.nodes.check_completion(state)
                
                # If not ending, select next action and generate question
                if not state.get("interview_complete", False):
                    state = self.nodes.select_next_action(state)
                    state = self.nodes.generate_question(state)
                else:
                    state = self.nodes.generate_final_summary(state)
                
                return state
            
            else:
                raise ValueError(f"Unknown workflow type: {workflow_type}")
                
        except Exception as e:
            logger.error(f"Error in workflow {workflow_type}: {e}")
            state["error"] = str(e)
            return state
    
    # ============================================================================
    # PUBLIC INTERFACE
    # ============================================================================
    
    def start_interview(
        self,
        interview_type: str,
        job_description: str = None,
        interviewer_persona: str = "Standard Technical Interviewer",
        weighted_metrics: list = None,
        max_questions: int = 10
    ) -> Dict[str, Any]:
        """
        Start a new interview session.
        
        Returns:
            Dict containing session_id and first question
        """
        try:
            # Create initial state
            initial_state = create_initial_state(
                interview_type=interview_type,
                job_description=job_description,
                interviewer_persona=interviewer_persona,
                weighted_metrics=weighted_metrics,
                max_questions=max_questions
            )
            
            # Run initialization
            result = self._run_workflow(initial_state, "initialize")
            
            # Store session
            self.sessions[initial_state["session_id"]] = result
            
            return {
                "session_id": result["session_id"],
                "current_question": result["current_question"],
                "question_count": result["question_count"],
                "interview_type": result["interview_type"],
                "interviewer_persona": result["interviewer_persona"],
                "max_questions": result["max_questions"],
                "current_interview_stage": result["current_interview_stage"].value
            }
            
        except Exception as e:
            logger.error(f"Error starting interview: {e}")
            raise
    
    def process_turn(
        self,
        session_id: str,
        candidate_answer: str,
        duration_seconds: float = None
    ) -> Dict[str, Any]:
        """
        Process a complete interview turn.
        
        Args:
            session_id: Interview session identifier
            candidate_answer: Candidate's response
            duration_seconds: Optional response duration
            
        Returns:
            Dict containing updated state and next question
        """
        try:
            # Get current state
            if session_id not in self.sessions:
                raise ValueError(f"No active interview session found: {session_id}")
            
            state = self.sessions[session_id].copy()
            
            # Add the candidate answer to state for processing
            state["_candidate_answer"] = candidate_answer
            state["_duration_seconds"] = duration_seconds
            
            # Process the answer through the workflow
            result = self._run_workflow(state, "process_turn")
            
            # Update stored session
            self.sessions[session_id] = result
            
            # Build response
            response = {
                "session_id": session_id,
                "question_count": result["question_count"],
                "current_question": result.get("current_question", ""),
                "interview_complete": result.get("interview_complete", False),
                "current_interview_stage": result["current_interview_stage"].value,
                "next_action": result.get("next_action", ActionType.CONTINUE_STANDARD).value,
                "average_score": result.get("average_score"),
                "real_time_feedback": self._format_feedback(result.get("real_time_feedback")),
                "completion_reason": result.get("completion_reason"),
                "overall_performance_summary": result.get("overall_performance_summary")
            }
            
            # Add performance metrics
            if result.get("flat_scores"):
                response["current_performance"] = result["flat_scores"]
            
            if result.get("conversation_history"):
                last_qa = result["conversation_history"][-1]
                response["last_answer_score"] = last_qa.score
                response["last_answer_feedback"] = last_qa.feedback
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing interview turn: {e}")
            raise
    
    def _format_feedback(self, feedback) -> Dict[str, Any]:
        """Format feedback for API response."""
        if not feedback:
            return None
        
        return {
            "summary": feedback.summary,
            "coaching_focus": feedback.coaching_focus,
            "timestamp": feedback.timestamp
        }
    
    def get_interview_state(self, session_id: str) -> Dict[str, Any]:
        """
        Get current interview state.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Dict containing current interview state
        """
        try:
            if session_id not in self.sessions:
                raise ValueError(f"No interview session found: {session_id}")
            
            state = self.sessions[session_id]
            
            return {
                "session_id": session_id,
                "interview_type": state["interview_type"],
                "interviewer_persona": state["interviewer_persona"],
                "question_count": state["question_count"],
                "max_questions": state["max_questions"],
                "current_question": state.get("current_question", ""),
                "current_interview_stage": state["current_interview_stage"].value,
                "interview_complete": state.get("interview_complete", False),
                "average_score": state.get("average_score"),
                "current_performance": state.get("flat_scores", {}),
                "conversation_history": [
                    {
                        "question": qa.question,
                        "answer": qa.answer,
                        "score": qa.score,
                        "timestamp": qa.timestamp,
                        "feedback": qa.feedback
                    } for qa in state.get("conversation_history", [])
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting interview state: {e}")
            raise
    
    def end_interview(self, session_id: str) -> Dict[str, Any]:
        """
        Manually end an interview and generate final summary.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Dict containing final interview summary
        """
        try:
            if session_id not in self.sessions:
                raise ValueError(f"No interview session found: {session_id}")
            
            state = self.sessions[session_id].copy()
            
            # Mark as complete and generate summary
            state["interview_complete"] = True
            state["completion_reason"] = "Manually ended by interviewer"
            
            # Generate final summary
            result = self.nodes.generate_final_summary(state)
            
            return {
                "session_id": session_id,
                "interview_complete": True,
                "completion_reason": result["completion_reason"],
                "question_count": result["question_count"],
                "average_score": result.get("average_score"),
                "overall_performance_summary": result["overall_performance_summary"],
                "final_metrics": result.get("flat_scores", {})
            }
            
        except Exception as e:
            logger.error(f"Error ending interview: {e}")
            raise
