// Types for the new interview session hooks
import type { ConversationItem, InterviewType, ExpertiseLevel, InterviewerPersona } from "@/types/interview"
import type { MicrophoneState } from "@/types/interview"
import type { JobDisplay } from "@/types/job"

export type InterviewStatus = "started" | "in_progress" | "completed"

export interface InterviewSessionData {
  id: string
  status: InterviewStatus
  interview_type: InterviewType
  expertise_level: ExpertiseLevel
  interviewer_persona: InterviewerPersona
  max_questions: number | null
  job_id?: string
  custom_job_description?: string
  user_id: string
  is_auto_answering: boolean
}

export interface InterviewSessionBaseState {
  // Session data
  sessionData: InterviewSessionData | null
  loading: boolean
  error: string | null
  
  // Conversation
  conversation: ConversationItem[]
  currentQuestion: string | null
  questionIndex: number
  
  // UI State  
  micState: MicrophoneState
  isPlayingAudio: boolean
  backendConnected: boolean
}

export interface InterviewSessionActions {
  startInterview: () => Promise<void>;
  completeInterview: () => Promise<void>;

  // Audio interactions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  generateAutoReply: () => Promise<void>;
  playAudio: (text: string) => Promise<void>;
  stopAudio: () => void;
  setMicState: (state: MicrophoneState) => void;

  // Utility
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export type FilterStatus = 'all' | 'in_progress' | 'completed' | 'abandoned'


export type SortBy = 'newest' | 'oldest' | 'turns'

export interface JobOption {
  id: string
  title: string
}

export interface SetupData {
  selectedJob: JobDisplay | null
  useExistingJob: boolean
  customJobDescription: string
  interviewType: InterviewType
  expertiseLevel: ExpertiseLevel
  interviewerPersona: InterviewerPersona
  maxQuestions: number | null
  isAutoAnswering: boolean
}