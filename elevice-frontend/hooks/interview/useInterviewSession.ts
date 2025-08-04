// Main orchestrating hook for interview sessions
import { useEffect, useCallback, useRef } from "react"
import { useInterviewSessionState } from "./useInterviewSessionState"
import { useInterviewAudio } from "./useInterviewAudio"
import { useInterviewLifecycle } from "./useInterviewLifecycle"
import { useBackendStatus } from "../useBackendStatus"
// Removed all references to missing types
import type { 
  InterviewSessionActions 
} from "../../types/types"

/**
 * Main interview session hook that orchestrates all sub-hooks
 * Follows composition principle: Combines focused hooks into a complete solution
 */
export const useInterviewSession = ({
  interviewId,
  apiUrl,
  userId,
  onComplete,
}: {
  interviewId: string;
  apiUrl: string;
  userId: string | null;
  onComplete: (sessionData: any) => void;
}): {
  state: any;
  actions: InterviewSessionActions;
} => {
  
  // Core state management
  const { state, actions: stateActions } = useInterviewSessionState()
  // TTS cache: text -> audioUrl
  const ttsCacheRef = useRef<{ [text: string]: string }>({})
  // Track the last TTS message to prevent duplicates
  const lastTtsMessageRef = useRef<string | null>(null)
  
  
  // Backend connectivity
  const { backendStatus } = useBackendStatus(apiUrl)
  
  // Update backend connection status
  useEffect(() => {
    stateActions.setBackendConnected(backendStatus === "connected")
  }, [backendStatus]) // stateActions are stable, don't include in deps
  
  
  // Interview lifecycle management
  const {
    loadSessionData,
    startInterview: lifecycleStartInterview,
    processUserResponse: lifecycleProcessUserResponse,
    generateAutoReply: lifecycleGenerateAutoReply,
    completeInterview: lifecycleCompleteInterview,
  } = useInterviewLifecycle({
    interviewId,
    sessionData: state.sessionData,
    apiUrl,
    userId,
    conversation: state.conversation,
    onSessionDataChange: stateActions.setSessionData,
    onConversationChange: stateActions.setConversation,
    onCurrentQuestionChange: stateActions.setCurrentQuestion,
    onQuestionIndexChange: stateActions.setQuestionIndex,
    onError: stateActions.setError,
    onComplete,
  })
  
  // --- Centralized handler for interview turn with retry logic ---
  const handleInterviewTurn = useCallback(
    async (text: string, duration: number) => {
      let attempt = 0;
      const maxRetries = 2; // Only one retry after first failure
      let lastError: any = null;
      while (attempt < maxRetries) {
        try {
          // Await the processUserResponse and get the updated conversation
          await lifecycleProcessUserResponse(text, duration);
          // After the turn, log the latest candidate feedback
          const latestCandidate = Array.isArray(state.conversation) ? state.conversation[state.conversation.length - 1] : undefined;
          if (latestCandidate && latestCandidate.speaker === "candidate" && latestCandidate.feedback) {
            console.log("Candidate feedback after turn:", latestCandidate.feedback);
          } else {
            // Try to find the last candidate with feedback
            const lastCandidateWithFeedback = Array.isArray(state.conversation)
              ? [...state.conversation].reverse().find(item => item.speaker === "candidate" && item.feedback)
              : undefined;
            if (lastCandidateWithFeedback) {
              console.log("Candidate feedback after turn:", lastCandidateWithFeedback.feedback);
            }
          }
          // Fetch technical speech analysis after successful turn
          if (state.sessionData?.id) {
            try {
              const analysisResponse = await fetch(`${apiUrl}/technical-speech-analysis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interview_id: state.sessionData.id })
              });
              const analysisData = await analysisResponse.json();
              console.log("TechnicalSpeechAnalysis response:", analysisData);
              stateActions.setSpeechAnalysis(analysisData);
            } catch (analysisErr) {
              console.warn("Failed to fetch technical speech analysis:", analysisErr);
            }
          }
          // TTS will be handled by the dedicated useEffect above
          stateActions.setMicState("idle");
          return;
        } catch (err: any) {
          attempt++;
          lastError = err;
          // Check for the specific error response
          const errorMsg = err?.message || String(err);
          const isProcessTurn500 = errorMsg.includes("Failed to process turn") && errorMsg.includes("Failed to update interview");
          console.warn(`Interview turn API failed (attempt ${attempt}):`, err);
          if (attempt >= maxRetries) {
            if (isProcessTurn500) {
              // Remove last input from conversation and ask user to change it
              stateActions.setError("Your last input could not be processed. Please change your answer and try again.");
              // Remove last turn from conversation (assume last is user input)
              // Remove last item from conversation array (assume state.conversation is ConversationItem[])
              if (Array.isArray(state.conversation) && state.conversation.length > 0) {
                stateActions.setConversation(state.conversation.slice(0, -1));
              }
              stateActions.setMicState("idle");
              return;
            } else {
              stateActions.setError("Failed to continue interview turn after multiple attempts.");
              stateActions.setMicState("idle");
              return;
            }
          }
        }
      }
    },
    [lifecycleProcessUserResponse, stateActions]
  );

  // Audio recording and transcription
  const {
    startRecording: audioStartRecording,
    stopRecording: audioStopRecording,
    playAudio,
    stopAudio,
    isRecordingAvailable,
    canStopRecording,
  } = useInterviewAudio({
    apiUrl,
    micState: state.micState,
    onMicStateChange: stateActions.setMicState,
    onInterviewTurn: handleInterviewTurn,
    onError: stateActions.setError,
  })
  
  // Handle TTS for new interviewer messages
  useEffect(() => {
    const handleNewInterviewerMessage = async () => {
      if (!Array.isArray(state.conversation) || state.conversation.length === 0) return;
      
      // Don't play TTS if interview is completed
      if (state.sessionData?.status === "completed") return;
      
      // Find the latest interviewer message
      const latestInterviewer = [...state.conversation].reverse().find(item => item.speaker === "interviewer" && item.text);
      
      if (!latestInterviewer || !latestInterviewer.text) return;
      
      // Check if this is a new message (not already processed for TTS)
      if (lastTtsMessageRef.current === latestInterviewer.text) return;
      
      console.log("🔊 Processing TTS for new interviewer message:", latestInterviewer.text);
      lastTtsMessageRef.current = latestInterviewer.text;
      
      const ttsText = latestInterviewer.text;
      try {
        if (ttsCacheRef.current[ttsText]) {
          // Already cached, just set for playback
          console.log("🔊 Using cached TTS");
          stateActions.setTtsAudioUrl(ttsCacheRef.current[ttsText]);
        } else {
          // Fetch and cache TTS
          console.log("🔊 Fetching new TTS");
          const ttsUrl = await playAudio(ttsText);
          if (ttsUrl) {
            ttsCacheRef.current[ttsText] = ttsUrl;
            stateActions.setTtsAudioUrl(ttsUrl);
          }
        }
      } catch (err) {
        console.error("🔊 TTS failed:", err);
      }
    };
    
    handleNewInterviewerMessage();
  }, [state.conversation, state.sessionData?.status, playAudio, stateActions])
  
  // Load session data on mount or when dependencies change
  useEffect(() => {
    if (!userId || !interviewId) {
      stateActions.setLoading(false)
      stateActions.setError("Missing user ID or session ID")
      return
    }
    
    const load = async () => {
      stateActions.setLoading(true)
      stateActions.setError(null)
      
      // Reset TTS tracking when loading a new session
      lastTtsMessageRef.current = null;
      
      const success = await loadSessionData()
      stateActions.setLoading(success ? false : true) // Keep loading if failed
    }
    
    load()
  }, [userId, interviewId, loadSessionData]) // stateActions are stable, don't include in deps
  
  // Action implementations that combine lifecycle and state management
  const actions: InterviewSessionActions = {
    // Interview lifecycle
    startInterview: useCallback(async () => {
      stateActions.setError(null);
      await lifecycleStartInterview();
    }, [lifecycleStartInterview, stateActions]),

    completeInterview: useCallback(async () => {
      stateActions.setError(null);
      await lifecycleCompleteInterview();
    }, [lifecycleCompleteInterview, stateActions]),

    // Audio interactions
    startRecording: useCallback(async () => {
      stateActions.setError(null);
      await audioStartRecording();
    }, [audioStartRecording, stateActions]),

    stopRecording: useCallback(() => {
      audioStopRecording();
    }, [audioStopRecording]),

    generateAutoReply: useCallback(async () => {
      stateActions.setError(null);
      stateActions.setMicState("generating");
      try {
        const autoReply = await lifecycleGenerateAutoReply();
        if (!autoReply || typeof autoReply.text !== "string" || typeof autoReply.duration !== "number") {
          stateActions.setError("Auto-reply generation failed: missing text or duration.");
          return;
        }
        // Use the same centralized handler for auto-reply
        await handleInterviewTurn(autoReply.text, autoReply.duration);
      } catch (err) {
        stateActions.setError("Failed to generate auto-reply.");
      }
      // Do not set micState to idle here; handleInterviewTurn will do it after processing
    }, [lifecycleGenerateAutoReply, handleInterviewTurn, stateActions]),

    playAudio: useCallback(async (text: string) => {
      stateActions.setError(null);
      stateActions.setAudioPlaying(true);
      try {
        // Use cache if available
        if (ttsCacheRef.current[text]) {
          stateActions.setTtsAudioUrl(ttsCacheRef.current[text]);
        } else {
          const ttsUrl = await playAudio(text);
          if (ttsUrl) {
            ttsCacheRef.current[text] = ttsUrl;
            stateActions.setTtsAudioUrl(ttsUrl);
          }
        }
      } finally {
        stateActions.setAudioPlaying(false);
      }
    }, [playAudio, stateActions]),

    stopAudio: useCallback(() => {
      stopAudio();
      stateActions.setAudioPlaying(false);
    }, [stopAudio, stateActions]),

    // Utility actions
    refreshSession: useCallback(async () => {
      stateActions.setLoading(true);
      stateActions.setError(null);
      const success = await loadSessionData();
      stateActions.setLoading(false);
      if (!success) {
        stateActions.setError("Failed to refresh session data");
      }
    }, [loadSessionData, stateActions]),

    clearError: useCallback(() => {
      stateActions.setError(null);
    }, [stateActions]),
    setMicState: stateActions.setMicState,
  };
  
  // Enhanced state with computed properties
  const enhancedState = {
    ...state,
    backendConnected: backendStatus === "connected",
    // Add computed state based on session status
    canStartInterview:
      state.sessionData?.status === "started" && backendStatus === "connected" && !state.loading,
    canInteract:
      state.sessionData?.status === "in_progress" && backendStatus === "connected" && !state.loading,
    isReadOnly: state.sessionData?.status === "completed",
    // Audio state
    canRecord:
      isRecordingAvailable && state.sessionData?.status === "in_progress" && backendStatus === "connected",
    canStopRecord: canStopRecording,
    canGenerateAutoReply:
      Boolean(state.sessionData?.is_auto_answering && state.micState === "idle" && state.sessionData?.status === "in_progress" && backendStatus === "connected"),
    ttsAudioUrl: state.ttsAudioUrl,
    // Speech analysis data
    speechAnalysis: state.speechAnalysis,
  };
  
  return {
    state: enhancedState,
    actions,
  }
}