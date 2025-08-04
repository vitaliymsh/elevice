import logging
from fastapi import HTTPException
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from shared.models import (
    # Core Interview Models
    InterviewTurn,
    Interview,
    InterviewParameters,
    UserSession,
    # Agent State Models
    InterviewFinalReport
)
from shared.supabase_client import get_supabase_client, test_supabase_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages database connections and operations using shared Supabase client."""
    
    def __init__(self):
        self.supabase = None
    
    async def initialize(self):
        """Initialize database connection using shared client."""
        try:
            self.supabase = get_supabase_client()
            if not test_supabase_connection():
                raise Exception("Supabase connection test failed")
            logger.info("Database connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def create_user_session(self, user_id: uuid.UUID) -> UserSession:
        """Create or update user session."""
        try:
            now = datetime.utcnow().isoformat()
            
            existing = self.supabase.table("user_sessions").select("*").eq("user_id", str(user_id)).execute()
            
            if existing.data:
                response = self.supabase.table("user_sessions").update({
                    "last_active": now
                }).eq("user_id", str(user_id)).execute()
                session_data = response.data[0]
            else:
                response = self.supabase.table("user_sessions").insert({
                    "user_id": str(user_id),
                    "created_at": now,
                    "last_active": now
                }).execute()
                session_data = response.data[0]
            
            return UserSession(
                user_id=uuid.UUID(session_data["user_id"]),
                created_at=datetime.fromisoformat(session_data["created_at"]),
                last_active=datetime.fromisoformat(session_data["last_active"])
            )
            
        except Exception as e:
            logger.error(f"Failed to create user session: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user session")
    
    async def create_interview(self, user_id: uuid.UUID, interview_type: str) -> Interview:
        """Create a new interview session."""
        try:
            interview_id = uuid.uuid4()
            now = datetime.utcnow().isoformat()
            
            # Create basic interview record with main columns only (no job_id for now)
            response = self.supabase.table("interviews").insert({
                "interview_id": str(interview_id),
                "user_id": str(user_id),
                "status": "in_progress",
                "created_at": now
            }).execute()
            
            # Create interview parameters record separately with jsonb parameters
            params_response = self.supabase.table("interview_parameters").insert({
                "id": str(interview_id),  # id is the interview_id foreign key
                "parameters": {
                    "interview_type": interview_type
                }
            }).execute()
            
            interview_data = response.data[0]
            
            interview = Interview(
                interview_id=uuid.UUID(interview_data["interview_id"]),
                user_id=uuid.UUID(interview_data["user_id"]),
                status=interview_data["status"],
                created_at=datetime.fromisoformat(interview_data["created_at"]),
                job_id=interview_data["job_id"] if "job_id" in interview_data else None
            )
            
            logger.info(f"Created interview {interview_id} for user {user_id}")
            return interview
            
        except Exception as e:
            logger.error(f"Failed to create interview: {e}")
            raise HTTPException(status_code=500, detail="Failed to create interview")
    
    async def create_interview_turn(
        self, 
        interview_id: uuid.UUID, 
        turn_index: int, 
        speaker: str, 
        text: str,
        feedback: Optional[Dict[str, Any]] = None,
        duration_seconds: Optional[float] = None
    ) -> InterviewTurn:
        """Create a new interview turn."""
        try:
            turn_id = uuid.uuid4()
            now = datetime.utcnow().isoformat()
            insert_data = {
                "turn_id": str(turn_id),
                "interview_id": str(interview_id),
                "turn_index": turn_index,
                "speaker": speaker,
                "text": text,
                "feedback": feedback,
                "created_at": now
            }
            if duration_seconds is not None:
                insert_data["duration_seconds"] = duration_seconds
            response = self.supabase.table("interview_turns").insert(insert_data).execute()
            turn_data = response.data[0]
            turn = InterviewTurn(
                turn_id=uuid.UUID(turn_data["turn_id"]),
                interview_id=uuid.UUID(turn_data["interview_id"]),
                turn_index=turn_data["turn_index"],
                speaker=turn_data["speaker"],
                text=turn_data["text"],
                feedback=turn_data.get("feedback"),
                created_at=datetime.fromisoformat(turn_data["created_at"]),
                duration_seconds=turn_data.get("duration_seconds")
            )
            logger.info(f"Created turn {turn_id} for interview {interview_id}")
            return turn
        except Exception as e:
            logger.error(f"Failed to create interview turn: {e}")
            raise HTTPException(status_code=500, detail="Failed to create interview turn")
    
    async def get_interview_turns(self, interview_id: uuid.UUID) -> List[InterviewTurn]:
        """Get all turns for an interview."""
        try:
            response = self.supabase.table("interview_turns").select("*").eq(
                "interview_id", str(interview_id)
            ).order("turn_index").execute()
            
            turns = []
            for turn_data in response.data:
                turn = InterviewTurn(
                    turn_id=uuid.UUID(turn_data["turn_id"]),
                    interview_id=uuid.UUID(turn_data["interview_id"]),
                    turn_index=turn_data["turn_index"],
                    speaker=turn_data["speaker"],
                    text=turn_data["text"],
                    feedback=turn_data.get("feedback"),
                    created_at=datetime.fromisoformat(turn_data["created_at"]),
                    duration_seconds=turn_data.get("duration_seconds")
                )
                turns.append(turn)
            
            return turns
            
        except Exception as e:
            logger.error(f"Failed to get interview turns: {e}")
            raise HTTPException(status_code=500, detail="Failed to get interview turns")

    async def get_interview_by_id(self, interview_id: uuid.UUID) -> Interview:
        """Get interview by ID with parameters."""
        try:
            # First get the interview
            response = self.supabase.table("interviews").select("*").eq(
                "interview_id", str(interview_id)
            ).execute()
            
            if not response.data:
                raise HTTPException(status_code=404, detail="Interview not found")
                
            interview_data = response.data[0]
            
            # Then get the parameters separately
            params_response = self.supabase.table("interview_parameters").select("parameters").eq(
                "id", str(interview_id)
            ).execute()

            params_data = params_response.data[0].get("parameters", {})
            
            # Extract interview_type from parameters JSON
            interview_type = "Unknown"
            if params_response.data and len(params_response.data) > 0:
                params_data = params_response.data[0].get("parameters", {})
                interview_type = params_data.get("interview_type", "Unknown")
            
            interview = Interview(
                interview_id=uuid.UUID(interview_data["interview_id"]),
                user_id=uuid.UUID(interview_data["user_id"]),
                status=interview_data["status"],
                created_at=datetime.fromisoformat(interview_data["created_at"]),
                job_id=uuid.UUID(interview_data["job_id"]) if interview_data.get("job_id") else None
            )
            
            return interview
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get interview by ID: {e}")
            raise HTTPException(status_code=500, detail="Failed to get interview")

    async def get_job_by_id(self, job_id: uuid.UUID):
        """Get job by ID."""
        try:
            response = self.supabase.table("jobs").select("*").eq("id", str(job_id)).execute()
            if not response.data:
                raise HTTPException(status_code=404, detail="Job not found")
            job_data = response.data[0]
            from shared.models import Job
            job = Job(
                id=uuid.UUID(job_data["id"]),
                name=job_data["name"],
                description=job_data["description"],
                position=job_data["position"],
                user_id=uuid.UUID(job_data["user_id"]),
                created_at=datetime.fromisoformat(job_data["created_at"])
            )
            return job
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get job by ID: {e}")
            raise HTTPException(status_code=500, detail="Failed to get job")
        
    async def get_interview_parameters_by_id(self, interview_id: uuid.UUID) -> InterviewParameters:
        """Get interview by ID with parameters."""
        try:
            params_response = self.supabase.table("interview_parameters").select("parameters").eq(
                "id", str(interview_id)
            ).execute()

            
            # Extract interview_type from parameters JSON
            # interview_type = "Unknown"
            # if params_response.data and len(params_response.data) > 0:
            #     params_data = params_response.data[0].get("parameters", {})
            #     interview_type = params_data.get("interview_type", "Unknown")
            params_data = params_response.data[0].get("parameters", {})
            

            interview_parameters = InterviewParameters(
                interview_id=str(interview_id),
                max_questions=params_data.get("max_questions", 10),
                interviewer_persona=params_data.get("interviewer_persona", "formal"),
                interview_type=params_data.get("interview_type", "general")
            )

            logger.info(f"Retrieved parameters for interview {interview_id}: {interview_parameters}")
            
            return interview_parameters
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get interview parameters by ID: {e}")
            raise HTTPException(status_code=500, detail="Failed to get interview parameters")
        

    async def get_interview_history(self, interview_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get interview conversation history."""
        try:
            turns = await self.get_interview_turns(interview_id)
            
            history = []
            for turn in turns:
                history.append({
                    "speaker": turn.speaker,
                    "text": turn.text,
                    "feedback": turn.feedback,
                    "created_at": turn.created_at.isoformat()
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get interview history: {e}")
            raise HTTPException(status_code=500, detail="Failed to get interview history")

    async def update_interview_status(
        self, 
        interview_id: uuid.UUID, 
        status: str
    ) -> Interview:
        """Update interview status."""
        try:
            response = self.supabase.table("interviews").update({
                "status": status
            }).eq("interview_id", str(interview_id)).execute()
            
            if not response.data:
                raise HTTPException(status_code=404, detail="Interview not found")
                
            interview_data = response.data[0]
            
            
            interview = Interview(
                interview_id=uuid.UUID(interview_data["interview_id"]),
                user_id=uuid.UUID(interview_data["user_id"]),
                status=interview_data["status"],
                created_at=datetime.fromisoformat(interview_data["created_at"]),
                job_id=uuid.UUID(interview_data["job_id"]) if interview_data.get("job_id") else None
            )

            
            return interview
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update interview status: {e}")
            raise HTTPException(status_code=500, detail="Failed to update interview status")

    async def store_final_report(self, report: InterviewFinalReport) -> Dict[str, Any]:
        """Store comprehensive final interview report in database."""
        try:
            report_data = {
                "interview_id": report.interview_id,
                "generated_at": report.generated_at.isoformat(),
                "completion_reason": report.completion_reason,
                "total_questions": report.total_questions,
                "interview_duration_minutes": report.interview_duration_minutes,
                "average_score": report.average_score,
                "metric_scores": report.metric_scores,
                "metric_trends": report.metric_trends,
                "performance_summary": report.performance_summary,
                "key_strengths": report.key_strengths,
                "areas_for_improvement": report.areas_for_improvement,
                "improvement_recommendations": report.improvement_recommendations,
                "question_types_covered": report.question_types_covered,
                "engagement_metrics": report.engagement_metrics,
                "overall_assessment": report.overall_assessment,
                "confidence_score": report.confidence_score,
                "hiring_recommendation": report.hiring_recommendation,
                "interviewer_notes": report.interviewer_notes,
                "follow_up_areas": report.follow_up_areas
            }
            
            response = self.supabase.table("interview_reports").insert(report_data).execute()
            
            logger.info(f"Stored final report for interview {report.interview_id}")
            return response.data[0]
            
        except Exception as e:
            logger.error(f"Failed to store final report: {e}")
            raise HTTPException(status_code=500, detail="Failed to store final report")

    async def get_final_report(self, interview_id: uuid.UUID) -> Optional[InterviewFinalReport]:
        """Retrieve final report for an interview."""
        try:
            response = self.supabase.table("interview_reports").select("*").eq(
                "interview_id", str(interview_id)
            ).execute()
            
            if not response.data:
                return None
                
            report_data = response.data[0]
            
            return InterviewFinalReport(
                interview_id=report_data["interview_id"],
                generated_at=datetime.fromisoformat(report_data["generated_at"]),
                completion_reason=report_data["completion_reason"],
                total_questions=report_data["total_questions"],
                interview_duration_minutes=report_data.get("interview_duration_minutes"),
                average_score=report_data["average_score"],
                metric_scores=report_data["metric_scores"],
                metric_trends=report_data.get("metric_trends"),
                performance_summary=report_data["performance_summary"],
                key_strengths=report_data["key_strengths"],
                areas_for_improvement=report_data["areas_for_improvement"],
                improvement_recommendations=report_data["improvement_recommendations"],
                question_types_covered=report_data["question_types_covered"],
                engagement_metrics=report_data["engagement_metrics"],
                overall_assessment=report_data["overall_assessment"],
                confidence_score=report_data["confidence_score"],
                hiring_recommendation=report_data["hiring_recommendation"],
                interviewer_notes=report_data.get("interviewer_notes"),
                follow_up_areas=report_data.get("follow_up_areas")
            )
            
        except Exception as e:
            logger.error(f"Failed to get final report: {e}")
            raise HTTPException(status_code=500, detail="Failed to get final report")

    async def get_job_interview_history(
        self, 
        job_id: uuid.UUID, 
        current_interview_id: Optional[uuid.UUID] = None,
        max_interviews: int = 3
    ) -> List[Dict[str, Any]]:
        """Get previous interview history for the same job."""
        try:
            # Get completed interviews for this job (excluding current one)
            query = self.supabase.table("interviews").select(
                "interview_id, user_id, status, created_at, job_id"
            ).eq("job_id", str(job_id)).eq("status", "completed").order("created_at", desc=True)
            
            if current_interview_id:
                query = query.neq("interview_id", str(current_interview_id))
                
            response = query.limit(max_interviews).execute()
            
            if not response.data:
                logger.info(f"No historical interviews found for job {job_id}")
                return []
            
            # For each interview, get key performance data and sample Q&As
            historical_context = []
            for interview_data in response.data:
                interview_id = interview_data["interview_id"]
                
                # Get final report for performance summary
                report_response = self.supabase.table("interview_reports").select(
                    "average_score, metric_scores, key_strengths, areas_for_improvement, overall_assessment"
                ).eq("interview_id", interview_id).execute()
                
                # Get sample conversation turns (first 2 Q&A pairs)
                turns_response = self.supabase.table("interview_turns").select(
                    "speaker, text, feedback"
                ).eq("interview_id", interview_id).order("turn_index").limit(6).execute()
                
                # Process turns into Q&A pairs
                sample_qa_pairs = []
                turns = turns_response.data or []
                for i in range(0, len(turns)-1, 2):
                    if (i+1 < len(turns) and 
                        turns[i]["speaker"] == "interviewer" and 
                        turns[i+1]["speaker"] == "candidate"):
                        sample_qa_pairs.append({
                            "question": turns[i]["text"],
                            "answer": turns[i+1]["text"][:200] + "..." if len(turns[i+1]["text"]) > 200 else turns[i+1]["text"],
                            "feedback": turns[i+1].get("feedback")
                        })
                        if len(sample_qa_pairs) >= 2:  # Limit to 2 Q&A pairs per interview
                            break
                
                # Compile historical interview context
                historical_interview = {
                    "interview_id": interview_id,
                    "user_id": interview_data["user_id"],
                    "interview_date": interview_data["created_at"],
                    "final_evaluation": interview_data.get("final_evaluation"),
                    "sample_qa_pairs": sample_qa_pairs
                }
                
                # Add performance data if available
                if report_response.data:
                    report_data = report_response.data[0]
                    historical_interview.update({
                        "average_score": report_data.get("average_score"),
                        "metric_scores": report_data.get("metric_scores", {}),
                        "key_strengths": report_data.get("key_strengths", []),
                        "areas_for_improvement": report_data.get("areas_for_improvement", []),
                        "overall_assessment": report_data.get("overall_assessment")
                    })
                
                historical_context.append(historical_interview)
            
            logger.info(f"Retrieved {len(historical_context)} historical interviews for job {job_id}")
            return historical_context
            
        except Exception as e:
            logger.error(f"Failed to get job interview history: {e}")
            return []  # Return empty list rather than failing

    