
import type {
  InterviewType,
  EvaluationResponse,
  ExpertiseLevel,
} from "@/types/interview";
import type {
  InterviewState,
  TechnicalSpeechAnalysisRequest,
  TechnicalSpeechAnalysisResponse
} from "@/types/api/api";
import { getBackendInterviewType } from "@/utils/interview";

// New API request/response types for the updated endpoints
interface StartInterviewRequest {
  interview_id: string;
}

interface StartInterviewResponse {
  interview_id: string;
  first_question: string;
  interview_state: InterviewState;
  status: string;
}

interface ProcessTurnRequest {
  interview_id: string;
  user_response: string;
  duration_seconds?: number;
}

interface ProcessTurnResponse {
  interview_id: string;
  next_question: string | null;
  interview_complete: boolean;
  interview_state: InterviewState;
  real_time_feedback: string | object | null;
  current_target_metric: string | null;
  performance_summary?: string | null;
}

interface EndInterviewRequestNew {
  interview_id: string;
  final_evaluation?: string;
}

interface EndInterviewResponseNew {
  interview_id: string;
  status: string;
  final_evaluation: string;
  message: string;
}

export class InterviewApiService {
  constructor(private apiUrl: string) {
    this.apiUrl = apiUrl;

  } // Added a comment to force re-evaluation

  // ===== NEW INTERVIEW API ENDPOINTS =====

  // Start/Resume Interview - POST /interview_id/start
  async startInterview(
    interviewId: string,
    userId: string
  ): Promise<StartInterviewResponse | null> {
    console.log("🌐 API Service: Starting/resuming interview with ID:", interviewId);
    console.log("🌐 API URL:", this.apiUrl);
    console.log("🌐 User ID:", userId);

    try {
      const request: StartInterviewRequest = {
        interview_id: interviewId
      };

      console.log("🌐 Request body:", request);

      const url = `${this.apiUrl}/interview/interview_id/start?user_id=${userId}`;
      console.log("🌐 Making fetch request to:", url);

      // Create AbortController for timeout (30 seconds for interview start)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log("🌐 Response status:", response.status);
      console.log("🌐 Response ok:", response.ok);
      console.log("🌐 Response data:", response.body);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API error response:", errorText);
        
        // Handle specific error cases
        if (response.status === 503) {
          throw new Error("Interview service is currently unavailable. Please try again in a few moments.");
        } else if (response.status >= 500) {
          throw new Error("Interview service is experiencing issues. Please try again later.");
        } else if (response.status === 404) {
          throw new Error("Interview not found. Please check your interview ID.");
        } else {
          throw new Error(`Failed to start interview: ${response.status} ${response.statusText}`);
        }
      }

      const result: StartInterviewResponse = await response.json();
      console.log("🌐 API response body:", result);
      console.log("✅ API Service: Interview started/resumed successfully");

      return result;
    } catch (err) {
      console.error('❌ Start interview API failed:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Interview start request timed out after 30 seconds. The backend may still be processing your request.');
      }
      return null;
    }
  }

  // Process Interview Turn - POST /interview_id/process_turn
  async processTurn(
    interviewId: string,
    userId: string,
    userResponse: string,
    durationSeconds?: number
  ): Promise<ProcessTurnResponse | null> {
    console.log("🌐 API Service: Processing turn for interview:", interviewId);
    console.log("🌐 User response:", userResponse);
    console.log("🌐 Duration:", durationSeconds);

    try {
      const request: ProcessTurnRequest = {
        interview_id: interviewId,
        user_response: userResponse,
        ...(durationSeconds !== undefined && { duration_seconds: durationSeconds })
      };

      console.log("🌐 Request body:", request);

      const url = `${this.apiUrl}/interview/interview_id/process_turn?user_id=${userId}`;
      console.log("🌐 Making fetch request to:", url);

      // Create AbortController for timeout (30 seconds for process turn)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log("🌐 Response status:", response.status);
      console.log("🌐 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API error response:", errorText);
        throw new Error(`Process turn API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: ProcessTurnResponse = await response.json();
      console.log("🌐 API response body:", result);
      console.log("✅ API Service: Turn processed successfully");

      return result;
    } catch (err) {
      console.error('❌ Process turn API failed:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Process turn request timed out after 30 seconds. The backend may still be processing your request.');
      }
      return null;
    }
  }

  // End Interview - POST /interview_id/end
  async endInterview(
    interviewId: string,
    userId: string,
    finalEvaluation?: string
  ): Promise<EndInterviewResponseNew | null> {
    console.log("🌐 API Service: Ending interview:", interviewId);
    console.log("🌐 Final evaluation:", finalEvaluation);

    try {
      const request: EndInterviewRequestNew = {
        interview_id: interviewId,
        ...(finalEvaluation && { final_evaluation: finalEvaluation })
      };

      console.log("🌐 Request body:", request);

      const url = `${this.apiUrl}/interview/interview_id/end?user_id=${userId}`;
      console.log("🌐 Making fetch request to:", url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
      });

      console.log("🌐 Response status:", response.status);
      console.log("🌐 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API error response:", errorText);
        throw new Error(`End interview API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: EndInterviewResponseNew = await response.json();
      console.log("🌐 API response body:", result);
      console.log("✅ API Service: Interview ended successfully");

      return result;
    } catch (err) {
      console.error('❌ End interview API failed:', err);
      return null;
    }
  }

  // ===== LEGACY FUNCTIONALITY (KEPT FOR BACKWARD COMPATIBILITY) =====

  // Auto-answering API call - Updated for new backend specification
  async getAutomaticAnswer(
    question: string,
    interviewType: InterviewType,
    conversation?: any[],
    _userId?: string,
    _durationSeconds?: number,
    expertiseLevel?: ExpertiseLevel
  ): Promise<{ answer: string; reasoning: string; duration_seconds: number } | null> {
    console.log("🌐 API Service: Getting automatic answer...");
    console.log("🌐 Question:", question);
    console.log("🌐 Interview type:", interviewType);
    console.log("🌐 Expertise level:", expertiseLevel);
    
    try {
      // Map frontend expertise levels to backend difficulty levels
      const getDifficultyLevel = (level?: ExpertiseLevel): string => {
        switch (level) {
          case 'uneducated':
          case 'foundational':
            return 'junior';
          case 'competent':
          case 'proficient':
            return 'intermediate';
          case 'strategic':
            return 'senior';
          default:
            return 'intermediate';
        }
      };

      const answerRequest: any = {
        question: question,
        interview_type: getBackendInterviewType(interviewType),
        difficulty_level: getDifficultyLevel(expertiseLevel)
      };

      // Add candidate profile if we have conversation history
      if (conversation && conversation.length > 0) {
        // Build conversation history in the expected format
        const conversationHistory = [];
        for (let i = 0; i < conversation.length; i += 2) {
          const questionItem = conversation[i];
          const answerItem = conversation[i + 1];
          
          if (questionItem?.speaker === "AI" && answerItem?.speaker === "User") {
            conversationHistory.push({
              question: questionItem.text,
              answer: answerItem.text,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        if (conversationHistory.length > 0) {
          answerRequest.conversation_history = conversationHistory;
          
          // Generate a basic candidate profile based on interview type and level
          const getExperienceLevel = (level?: ExpertiseLevel): string => {
            switch (level) {
              case 'uneducated':
              case 'foundational':
                return '1-2';
              case 'competent':
              case 'proficient':
                return '3-5';
              case 'strategic':
                return '5+';
              default:
                return '3-5';
            }
          };

          const getProfileLevel = (level?: ExpertiseLevel): string => {
            switch (level) {
              case 'uneducated':
              case 'foundational':
                return 'entry-level';
              case 'competent':
              case 'proficient':
                return 'mid-level';
              case 'strategic':
                return 'senior-level';
              default:
                return 'mid-level';
            }
          };

          // Map interview types to backend types for profile generation
          const backendType = getBackendInterviewType(interviewType);
          
          const profileTemplates: Record<string, string> = {
            technical: `Software developer with ${getExperienceLevel(expertiseLevel)} years of experience`,
            behavioral: `Professional with ${getProfileLevel(expertiseLevel)} experience in team environments`,
            general: `Candidate with ${getProfileLevel(expertiseLevel)} professional background`
          };
          
          answerRequest.candidate_profile = profileTemplates[backendType] || profileTemplates.general;
        }
      }

      console.log("🌐 Auto answer request:", answerRequest);

      const response = await fetch(`${this.apiUrl}/auto_answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answerRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Auto answer API error:", errorText);
        throw new Error(`Auto answer API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ Auto answer raw response:", data);
      
      // Handle both array and single object responses from backend
      let responseData = data;
      if (Array.isArray(data)) {
        console.log("🔄 Backend returned array with", data.length, "items, using first item");
        if (data.length > 0) {
          responseData = data[0];
          console.log("🔄 Selected first item:", responseData);
        } else {
          console.error("❌ Backend returned empty array");
          return null;
        }
      }
      
      // Validate the response data structure
      if (!responseData || typeof responseData !== 'object') {
        console.error("❌ Invalid response data structure:", responseData);
        return null;
      }
      
      // Extract the answer, handling different possible structures
      const answer = responseData.answer || responseData.text || "";
      const reasoning = responseData.reasoning || responseData.explanation || "";
      const duration_seconds = responseData.duration_seconds || responseData.duration || 0;
      
      console.log("🔄 Processed answer data:", { answer, reasoning, duration_seconds });
      
      // Return the full response object with answer, reasoning, and duration
      return {
        answer: answer,
        reasoning: reasoning,
        duration_seconds: duration_seconds
      };
    } catch (err) {
      console.error('❌ Automatic answer generation failed:', err);
      return null;
    }
  }

  // Technical Speech Analysis - POST /technical-speech-analysis
  async getTechnicalSpeechAnalysis(
    interviewId: string
  ): Promise<TechnicalSpeechAnalysisResponse | null> {
    console.log("🎤 API Service: Getting technical speech analysis for interview:", interviewId);
    console.log("🎤 API URL:", this.apiUrl);

    try {
      const request: TechnicalSpeechAnalysisRequest = {
        interview_id: interviewId
      };

      console.log("🎤 Request body:", request);

      const url = `${this.apiUrl}/technical-speech-analysis`;
      console.log("🎤 Making fetch request to:", url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
      });

      console.log("🎤 Response status:", response.status);
      console.log("🎤 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Technical speech analysis API error:", errorText);
        throw new Error(`Technical speech analysis API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Technical speech analysis response:", result);
      return result;
    } catch (err) {
      console.error('❌ Technical speech analysis failed:', err);
      return null;
    }
  }
}

// Create a singleton instance
export const createInterviewApiService = (apiUrl: string) => new InterviewApiService(apiUrl);
