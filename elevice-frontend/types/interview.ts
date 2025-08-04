// Interview related types
export type InterviewType = "general" | 
  "software-engineer" | 
  "product-manager" | 
  "sales-representative" | 
  "project-manager" | 
  "business-analyst"

export type ExpertiseLevel = "uneducated" | "foundational" | "competent" | "proficient" | "strategic"

export type InterviewerPersona = "friendly" | "formal" | "challenging" | "supportive" | "analytical" | "conversational"

export interface SegmentFeedback {
  segment_text: string;
  feedback_type: 'great' | 'warning' | 'improve' | 'clarify';
  comment: string;
}

export interface MetricData {
  speaking_rate_wpm: number;
  filler_word_count: number;
  star_adherence_score: number;
  vocabulary_richness_score: number;
  action_verb_count: number;
}

export interface EvaluationResponse {
  summary: string;
  strengths: string[];
  improvements: string[];
  segment_feedback: SegmentFeedback[];
  metrics?: MetricData;
}

export interface ConversationItem {
  speaker: 'interviewer' | 'candidate';
  text: string;
  feedback?: EvaluationResponse;
  isPlaceholder?: boolean; // Flag to identify placeholder messages during generation
}

export interface Session {
  id: string
  date: string
  time: string
  type: InterviewType
  outcome: string
  feedback: EvaluationResponse
  transcript: ConversationItem[]
}

export type MicrophoneState = "idle" | "recording" | "processing" | "generating" | "playing";

export interface InterviewFlowState {
  isInterviewActive: boolean;
  isInterviewStarted: boolean;
  currentInterviewId: string | null;
  conversationLoaded: boolean;
  isAPILoading: boolean;
}
