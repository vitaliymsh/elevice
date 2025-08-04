// Core state management for interview session
import { useReducer, useMemo } from "react"
import type { ConversationItem } from "@/types/interview"
import type { InterviewSessionData, InterviewSessionBaseState } from "../../types/types"
import type { MicrophoneState } from "@/types/interview"
import type { TechnicalSpeechAnalysisResponse } from "@/types/api/api"

// State reducer for complex state updates
type StateAction = 
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SESSION_DATA"; payload: InterviewSessionData | null }
  | { type: "SET_CONVERSATION"; payload: ConversationItem[] }
  | { type: "ADD_MESSAGE"; payload: ConversationItem }
  | { type: "UPDATE_LAST_MESSAGE"; payload: Partial<ConversationItem> }
  | { type: "REMOVE_LAST_MESSAGE" }
  | { type: "SET_CURRENT_QUESTION"; payload: string | null }
  | { type: "SET_QUESTION_INDEX"; payload: number }
  | { type: "SET_MIC_STATE"; payload: MicrophoneState }
  | { type: "SET_AUDIO_PLAYING"; payload: boolean }
  | { type: "SET_BACKEND_CONNECTED"; payload: boolean }
  | { type: "SET_TTS_AUDIO_URL"; payload: string | null }
  | { type: "SET_SPEECH_ANALYSIS"; payload: TechnicalSpeechAnalysisResponse | null }
  | { type: "RESET_STATE" }

const initialState: InterviewSessionBaseState & { ttsAudioUrl?: string | null; speechAnalysis?: TechnicalSpeechAnalysisResponse | null } = {
  sessionData: null,
  loading: true,
  error: null,
  conversation: [],
  currentQuestion: null,
  questionIndex: 0,
  micState: "idle",
  isPlayingAudio: false,
  backendConnected: false,
  ttsAudioUrl: null,
  speechAnalysis: null,
}

function sessionStateReducer(state: InterviewSessionBaseState & { ttsAudioUrl?: string | null; speechAnalysis?: TechnicalSpeechAnalysisResponse | null }, action: StateAction): InterviewSessionBaseState & { ttsAudioUrl?: string | null; speechAnalysis?: TechnicalSpeechAnalysisResponse | null } {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    
    case "SET_ERROR":
      return { ...state, error: action.payload }
      
    case "SET_SESSION_DATA":
      return { ...state, sessionData: action.payload }
      
    case "SET_CONVERSATION":
      return { ...state, conversation: action.payload }
      
    case "ADD_MESSAGE":
      return { ...state, conversation: [...state.conversation, action.payload] }
      
    case "UPDATE_LAST_MESSAGE":
      if (state.conversation.length === 0) return state
      const updatedConversation = [...state.conversation]
      const lastIndex = updatedConversation.length - 1
      updatedConversation[lastIndex] = { ...updatedConversation[lastIndex], ...action.payload }
      return { ...state, conversation: updatedConversation }
      
    case "REMOVE_LAST_MESSAGE":
      if (state.conversation.length === 0) return state
      return { ...state, conversation: state.conversation.slice(0, -1) }
      
    case "SET_CURRENT_QUESTION":
      return { ...state, currentQuestion: action.payload }
      
    case "SET_QUESTION_INDEX":
      return { ...state, questionIndex: action.payload }
      
    case "SET_MIC_STATE":
      return { ...state, micState: action.payload }
      
    case "SET_AUDIO_PLAYING":
      return { ...state, isPlayingAudio: action.payload }
      
    case "SET_BACKEND_CONNECTED":
      return { ...state, backendConnected: action.payload }
      
    case "SET_TTS_AUDIO_URL":
      return { ...state, ttsAudioUrl: action.payload }
      
    case "SET_SPEECH_ANALYSIS":
      return { ...state, speechAnalysis: action.payload }
      
    case "RESET_STATE":
      return initialState
      
    default:
      return state
  }
}

/**
 * Core state management hook for interview session
 * Follows SRP: Only manages state, no side effects
 */
export const useInterviewSessionState = () => {
  const [state, dispatch] = useReducer(sessionStateReducer, initialState)
  
  // Action creators that encapsulate state updates (memoized for stability)
  const actions = useMemo(() => ({
    setLoading: (loading: boolean) => {
      dispatch({ type: "SET_LOADING", payload: loading })
    },
    
    setError: (error: string | null) => {
      dispatch({ type: "SET_ERROR", payload: error })
    },
    
    setSessionData: (sessionData: InterviewSessionData | null) => {
      dispatch({ type: "SET_SESSION_DATA", payload: sessionData })
    },
    
    setConversation: (conversation: ConversationItem[]) => {
      dispatch({ type: "SET_CONVERSATION", payload: conversation })
    },
    
    addMessage: (message: ConversationItem) => {
      dispatch({ type: "ADD_MESSAGE", payload: message })
    },
    
    updateLastMessage: (updates: Partial<ConversationItem>) => {
      dispatch({ type: "UPDATE_LAST_MESSAGE", payload: updates })
    },
    
    removeLastMessage: () => {
      dispatch({ type: "REMOVE_LAST_MESSAGE" })
    },
    
    setCurrentQuestion: (question: string | null) => {
      dispatch({ type: "SET_CURRENT_QUESTION", payload: question })
    },
    
    setQuestionIndex: (index: number) => {
      dispatch({ type: "SET_QUESTION_INDEX", payload: index })
    },
    
    setMicState: (micState: MicrophoneState) => {
      dispatch({ type: "SET_MIC_STATE", payload: micState })
    },
    
    setAudioPlaying: (playing: boolean) => {
      dispatch({ type: "SET_AUDIO_PLAYING", payload: playing })
    },
    
    setBackendConnected: (connected: boolean) => {
      dispatch({ type: "SET_BACKEND_CONNECTED", payload: connected })
    },
    
    resetState: () => {
      dispatch({ type: "RESET_STATE" })
    },
    setTtsAudioUrl: (url: string | null) => {
      dispatch({ type: "SET_TTS_AUDIO_URL", payload: url })
    },
    
    setSpeechAnalysis: (analysis: TechnicalSpeechAnalysisResponse | null) => {
      dispatch({ type: "SET_SPEECH_ANALYSIS", payload: analysis })
    },
  }), []) // Empty deps since dispatch is stable from useReducer
  
  return { state, actions }
}