// Interview lifecycle management: start, progress, and completion
import { useCallback, useEffect, useRef } from "react"
import { createInterviewApiService } from "@/services/api/interview"
import { DatabaseService } from "@/services/database"
import type { ConversationItem, InterviewType, ExpertiseLevel, InterviewerPersona } from "@/types/interview"
import type { InterviewSessionData, InterviewStatus } from "../../types/types"

interface UseInterviewLifecycleOptions {
  interviewId: string
  sessionData: InterviewSessionData | null
  apiUrl: string
  userId: string | null
  conversation: ConversationItem[]
  onSessionDataChange: (data: InterviewSessionData | null) => void
  onConversationChange: (conversation: ConversationItem[]) => void
  onCurrentQuestionChange: (question: string | null) => void
  onQuestionIndexChange: (index: number) => void
  onError: (error: string) => void
  onComplete?: (sessionData: InterviewSessionData) => void
}

/**
 * Manages interview lifecycle: loading, starting, progressing, and completing
 * Follows SRP: Only handles interview flow and API interactions
 */
export const useInterviewLifecycle = ({
  interviewId,
  sessionData,
  apiUrl,
  userId,
  conversation,
  onSessionDataChange,
  onConversationChange,
  onCurrentQuestionChange,
  onQuestionIndexChange,
  onError,
  onComplete,
}: UseInterviewLifecycleOptions) => {
  const interviewApiRef = useRef(createInterviewApiService(apiUrl))
  
  // Update API service when URL changes
  useEffect(() => {
    interviewApiRef.current = createInterviewApiService(apiUrl)
  }, [apiUrl])
  
  // Load session data from database
  const loadSessionData = useCallback(async () => {
    if (!userId || !interviewId) {
      onError("Missing user ID or interview ID")
      return false
    }
    
    try {
      console.log("📄 Loading session data for:", interviewId)
      const session = await DatabaseService.getInterview(interviewId)
      
      if (!session || session.user_id !== userId) {
        onError("Interview session not found or access denied")
        return false
      }
      
      console.log("📄 Session loaded:", session.status)
      
      // Map database session to our InterviewSessionData type
      const sessionData: InterviewSessionData = {
        id: session.interview_id,
        status: session.status as InterviewStatus,
        interview_type: session.interview_type as InterviewType,
        expertise_level: (session.expertise_level as ExpertiseLevel) || "foundational",
        interviewer_persona: (session.interviewer_persona as InterviewerPersona) || "friendly", 
        max_questions: session.max_questions || null,
        job_id: session.job_id,
        custom_job_description: session.custom_job_description,
        user_id: session.user_id,
        is_auto_answering: session.is_auto_answering || false
      }
      
      onSessionDataChange(sessionData)
      
      // Load conversation if interview is in progress or completed
      if (session.status === "in_progress" || session.status === "completed") {
        const turns = await DatabaseService.getInterviewTurns(interviewId)
        const conversationItems = turns.map(turn => {
          let feedback = undefined;
          if (turn.feedback) {
            if (typeof turn.feedback === "string") {
              try {
                feedback = JSON.parse(turn.feedback);
              } catch (err) {
                console.warn("📄 Failed to parse feedback JSON for turn:", turn.turn_id, "Error:", err);
                feedback = undefined;
                console.log('Raw feedback string:', turn.feedback);
              }
            } else if (typeof turn.feedback === "object") {
              feedback = turn.feedback;
            }
          }
          
          return {
            speaker: turn.speaker as "interviewer" | "candidate", 
            text: turn.text,
            feedback
          }
        })
        
        onConversationChange(conversationItems)
        
        // Set current question and index
        const lastInterviewerMessage = conversationItems
          .filter(item => item.speaker === "interviewer")
          .pop()
        
        if (lastInterviewerMessage) {
          onCurrentQuestionChange(lastInterviewerMessage.text)
          onQuestionIndexChange(conversationItems.filter(item => item.speaker === "interviewer").length)
        }
      }
      
      return true
    } catch (err) {
      console.error("📄 Failed to load session:", err)
      onError(err instanceof Error ? err.message : "Failed to load interview session")
      return false
    }
  }, [interviewId, userId, onSessionDataChange, onConversationChange, onCurrentQuestionChange, onQuestionIndexChange, onError])
  
  // Start interview (for status='started')
  const startInterview = useCallback(async () => {
    if (!sessionData || !userId) {
      onError("Cannot start interview: Missing session data or user ID")
      return
    }
    
    if (sessionData.status !== "started") {
      onError("Interview cannot be started from current status")
      return
    }
    
    try {
      console.log("🚀 Starting interview...")
      const result = await interviewApiRef.current.startInterview(interviewId, userId)
      
      if (!result || !result.first_question) {
        onError("Failed to start interview: No initial question received")
        return
      }
      
      // Update session status in database
      await DatabaseService.updateInterviewStatus(interviewId, "in_progress")
      
      // Update local state
      onSessionDataChange({ ...sessionData, status: "in_progress" })
      
      // Add first question to conversation
      const firstQuestion: ConversationItem = {
        speaker: "interviewer",
        text: result.first_question
      }
      
      onConversationChange([firstQuestion])
      onCurrentQuestionChange(result.first_question)
      onQuestionIndexChange(1)
      
    } catch (err) {
      console.error("🚀 Failed to start interview:", err)
      onError(err instanceof Error ? err.message : "Failed to start interview")
    }
  }, [sessionData, userId, interviewId, onSessionDataChange, onConversationChange, onCurrentQuestionChange, onQuestionIndexChange, onError])
  
  // Process user response and get next question
  const processUserResponse = useCallback(async (responseText: string, duration?: number) => {
    if (!sessionData || !userId) {
      onError("Cannot process response: Missing session data or user ID")
      return
    }
    
    if (sessionData.status !== "in_progress") {
      onError("Cannot process response: Interview not in progress")
      return
    }
    
    try {
      console.log("💬 Processing user response...")
      
      // Add user response to conversation optimistically
      const userResponse: ConversationItem = {
        speaker: "candidate",
        text: responseText
      }
      
      const updatedConversation = [...conversation, userResponse]
      onConversationChange(updatedConversation)
      
      // Send to backend
      const result = await interviewApiRef.current.processTurn(
        interviewId,
        userId,
        responseText,
        duration || 0
      )
      
      if (!result) {
        // Remove optimistic update on failure
        onConversationChange(conversation)
        onError("Failed to process response")
        return
      }
      
      // Handle interview completion
      if (result.interview_complete || !result.next_question) {
        console.log("🏁 Interview completed")
        await DatabaseService.updateInterviewStatus(interviewId, "completed")
        
        const completedSessionData = { ...sessionData, status: "completed" as InterviewStatus }
        onSessionDataChange(completedSessionData)
        
        if (onComplete) {
          onComplete(completedSessionData)
        }
        return
      }
      
      // Add next question
      if (result.next_question) {
        const nextQuestion: ConversationItem = {
          speaker: "interviewer", 
          text: result.next_question
        }
        
        const finalConversation = [...updatedConversation, nextQuestion]
        onConversationChange(finalConversation)
        onCurrentQuestionChange(result.next_question)
        onQuestionIndexChange(finalConversation.filter(item => item.speaker === "interviewer").length)
      }
      
    } catch (err) {
      console.error("💬 Failed to process response:", err)
      // Remove optimistic update on error
      onConversationChange(conversation)
      onError(err instanceof Error ? err.message : "Failed to process response")
    }
  }, [sessionData, userId, interviewId, conversation, onConversationChange, onCurrentQuestionChange, onQuestionIndexChange, onSessionDataChange, onError, onComplete])
  
  // Generate automatic reply
  const generateAutoReply = useCallback(async () => {
    if (!sessionData || !userId) {
      onError("Cannot generate auto reply: Missing session data or user ID")
      return
    }
    
    const currentQuestion = conversation
      .filter(item => item.speaker === "interviewer")
      .pop()?.text
    
    if (!currentQuestion) {
      onError("No current question available for auto reply")
      return
    }
    
    try {
      console.log("🤖 Generating automatic reply...")
      const result = await interviewApiRef.current.getAutomaticAnswer(
        currentQuestion,
        sessionData.interview_type,
        conversation,
        userId,
        undefined, // duration not available for auto replies
        sessionData.expertise_level
      )
      if (!result || !result.answer) {
        onError("Failed to generate automatic reply")
        return { text: "", duration: 0 }
      }
      console.log("🤖 Auto reply generated:", result.answer.substring(0, 100) + "...")
      // Do not process here, let parent handle
      return { text: result.answer, duration: result.duration_seconds || 0 }
    } catch (err) {
      console.error("🤖 Failed to generate auto reply:", err)
      onError(err instanceof Error ? err.message : "Failed to generate automatic reply")
      return { text: "", duration: 0 }
    }
  }, [sessionData, userId, conversation, processUserResponse, onError])
  
  // Complete interview manually
  const completeInterview = useCallback(async () => {
    if (!sessionData) {
      onError("Cannot complete interview: Missing session data")
      return
    }
    
    try {
      console.log("🏁 Completing interview...")
      await DatabaseService.updateInterviewStatus(interviewId, "completed")
      
      const completedSessionData = { ...sessionData, status: "completed" as InterviewStatus }
      onSessionDataChange(completedSessionData)
      
      if (onComplete) {
        onComplete(completedSessionData)
      }
      
    } catch (err) {
      console.error("🏁 Failed to complete interview:", err)
      onError(err instanceof Error ? err.message : "Failed to complete interview")
    }
  }, [sessionData, interviewId, onSessionDataChange, onComplete, onError])
  
  return {
    loadSessionData,
    startInterview,
    processUserResponse,
    generateAutoReply,
    completeInterview,
  }
}