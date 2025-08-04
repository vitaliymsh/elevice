from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
import sys
import os

# Add parent directory to Python path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from shared.models import (
    TechnicalSpeechAnalysisRequest,
    TechnicalSpeechAnalysisResponse,
)
from llm_client import LLMClient
from evaluator import Evaluator
from shared.supabase_client import get_supabase_client
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="Elevice Evaluation Service",
    description="Advanced evaluation service with technical speech analysis and per-message analysis",
    version="2.0.0"
)
llm_client = LLMClient()
enhanced_evaluator = Evaluator()
supabase = get_supabase_client()

@app.get("/")
def read_root():
    return {"Hello": "Evaluation Service", "status": "healthy"}

# ================================================================================
# ENHANCED EVALUATION ENDPOINTS
# ================================================================================

@app.post("/technical-speech-analysis", response_model=TechnicalSpeechAnalysisResponse)
async def analyze_technical_speech(request: TechnicalSpeechAnalysisRequest):
    """
    Comprehensive technical speech analysis for entire interview.
    
    Analyzes speaking patterns, vocabulary, structure, and communication effectiveness
    based on the complete interview data stored in the database.
    
    Features:
    - Speaking rate and pace consistency analysis
    - Filler word detection and percentage calculation
    - Vocabulary richness and technical term usage
    - STAR method adherence scoring
    - Professional communication assessment
    - Actionable improvement recommendations
    """
    try:
        logger.info(f"Processing technical speech analysis for interview {request.interview_id}")
        
        # Fetch complete interview data from database
        interview_data = await _fetch_interview_data(request.interview_id)
        if not interview_data:
            raise HTTPException(
                status_code=404,
                detail=f"Interview {request.interview_id} not found"
            )
        
        # Perform comprehensive technical speech analysis
        analysis_result = await enhanced_evaluator.analyze_technical_speech(interview_data)
        
        logger.info(f"Technical speech analysis completed for interview {request.interview_id}")
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during technical speech analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing technical speech analysis"
        )

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

async def _fetch_interview_data(interview_id: str) -> dict:
    """
    Fetch complete interview data from database.
    
    Args:
        interview_id: The interview ID to fetch
        
    Returns:
        Dictionary containing complete interview data including:
        - conversation_history: All Q&A pairs with turn data
        - metadata: Interview type, duration, etc.
        - user_responses: Extracted candidate responses for analysis
        - interviewer_questions: All interviewer questions
    """
    try:
        # Query the database for interview metadata
        result = supabase.table('interviews').select('*').eq('interview_id', interview_id).execute()
        
        if not result.data:
            logger.warning(f"Interview {interview_id} not found in interviews table")
            return None
        
        interview_record = result.data[0]
        
        # Fetch interview parameters to get interview_type
        params_result = supabase.table('interview_parameters').select('parameters').eq('id', interview_id).execute()
        interview_type = 'general'
        if params_result.data and len(params_result.data) > 0:
            params = params_result.data[0].get('parameters', {})
            interview_type = params.get('interview_type', 'general')
        
        # Fetch all interview turns (questions and responses)
        turns_result = supabase.table('interview_turns').select('*').eq('interview_id', interview_id).order('turn_index').execute()
        
        # Process turns into structured conversation history
        conversation_history = []
        user_responses = []
        interviewer_questions = []
        total_word_count = 0
        estimated_duration_minutes = 0.0
        
        if turns_result.data:
            # Group turns into Q&A pairs
            turns = turns_result.data
            for i in range(0, len(turns), 2):
                if i + 1 < len(turns):
                    question_turn = turns[i]
                    answer_turn = turns[i + 1]
                    
                    if question_turn.get('speaker') == 'interviewer' and answer_turn.get('speaker') == 'candidate':
                        # Create conversation pair
                        qa_pair = {
                            'question': question_turn.get('text', ''),
                            'answer': answer_turn.get('text', ''),
                            'question_timestamp': question_turn.get('created_at'),
                            'answer_timestamp': answer_turn.get('created_at'),
                            'feedback': answer_turn.get('feedback')
                        }
                        conversation_history.append(qa_pair)
                        
                        # Extract candidate responses for analysis
                        answer_text = answer_turn.get('text', '')
                        if answer_text:
                            user_responses.append(answer_text)
                            word_count = len(answer_text.split())
                            total_word_count += word_count
                            # Estimate speaking time: ~150 words per minute
                            estimated_duration_minutes += word_count / 150.0
                        
                        # Extract interviewer questions
                        question_text = question_turn.get('text', '')
                        if question_text:
                            interviewer_questions.append(question_text)
        
        # Combine interview metadata with processed conversation data
        interview_data = {
            'interview_id': interview_id,
            'interview_type': interview_type,
            'status': interview_record.get('status', 'completed'),
            'created_at': interview_record.get('created_at'),
            'last_updated_at': interview_record.get('last_updated_at'),
            'final_evaluation': interview_record.get('final_evaluation'),
            
            # Processed conversation data
            'conversation_history': conversation_history,
            'user_responses': user_responses,
            'interviewer_questions': interviewer_questions,
            
            # Calculated metrics
            'total_word_count': total_word_count,
            'total_duration_minutes': estimated_duration_minutes,
            'num_questions': len(interviewer_questions),
            'num_responses': len(user_responses)
        }
        
        logger.info(f"Fetched interview data: {len(conversation_history)} Q&A pairs, {total_word_count} total words")
        return interview_data
        
    except Exception as e:
        logger.error(f"Error fetching interview data for {interview_id}: {e}")
        return None