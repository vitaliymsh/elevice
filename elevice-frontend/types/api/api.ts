// Enhanced API types for the new interview service endpoints

// Weighted metric configuration
export interface WeightedMetric {
  metric_name: 'technical_acumen' | 'problem_solving' | 'communication' | 'leadership' | 'cultural_fit';
  weight: number;
}

// Enhanced start interview request
export interface EnhancedStartInterviewRequest {
  interview_type: string;
  job_description?: string;
  interviewer_persona?: string;
  weighted_metrics?: WeightedMetric[];
  max_questions?: number;
}

// Interview state tracking
export interface InterviewState {
  session_id: string;
  interview_type: string;
  current_question: string;
  question_count: number;
  current_interview_stage: string;
  weighted_metrics: WeightedMetric[];
  current_target_metric?: string | null;
  weakness_tracking: Record<string, { score: number; attempts: number }>;
  interview_complete: boolean;
  current_scores?: Record<string, number>;
  average_score?: number;
}

// Enhanced start interview response
export interface EnhancedStartInterviewResponse {
  interview_id: string;
  first_question: string;
  status: string;
  interview_state: InterviewState;
  session_id: string;
}

// Process turn request
export interface EnhancedProcessTurnRequest {
  user_response: string;
  interview_state: InterviewState;
  duration_seconds?: number;
}

// Session progress tracking
export interface SessionProgress {
  metrics_targeted: number;
  average_score: number;
  interview_stage: string;
}

// Enhanced process turn response
export interface EnhancedProcessTurnResponse {
  next_question?: string;
  interview_complete: boolean;
  interview_state: InterviewState;
  real_time_feedback?: string;
  current_target_metric?: string;
  performance_summary?: string;
  question_count: number;
  session_progress: SessionProgress;
}

// Performance breakdown
export interface PerformanceBreakdown {
  [metric: string]: {
    score: number;
    feedback: string;
  };
}

// Completion analysis
export interface CompletionAnalysis {
  reason: string;
  efficiency_score: number;
  optimal_length: boolean;
}

// Agent effectiveness metrics
export interface AgentEffectiveness {
  adaptation_score: number;
  targeting_accuracy: number;
  question_quality: number;
}

// Interview summary response
export interface InterviewSummaryResponse {
  interview_id: string;
  interview_state: InterviewState;
  performance_breakdown: PerformanceBreakdown;
  completion_analysis: CompletionAnalysis;
  agent_effectiveness: AgentEffectiveness;
  hiring_recommendation: string;
  development_areas: string[];
  conversation_highlights: string[];
  total_questions: number;
  interview_duration_minutes: number;
  user_id: string;
  created_at: string;
}

// Conversation history item
export interface ConversationHistoryItem {
  question: string;
  user_response: string;
  ai_feedback: string;
  timestamp: string;
  scores: Record<string, number>;
  turn_analytics: {
    response_quality: string;
    target_metric: string;
    improvement_detected: boolean;
  };
}

// Interview history response
export interface InterviewHistoryResponse {
  interview_id: string;
  conversation_history: ConversationHistoryItem[];
  interview_metadata: {
    status: string;
    total_turns: number;
    completion_analysis: CompletionAnalysis;
  };
  intelligent_analytics: {
    performance_trends: string;
    weakness_targeting_effectiveness: number;
    agent_adaptation_score: number;
  };
}

// User history item
export interface UserHistoryItem {
  interview_id: string;
  interview_type: string;
  status: string;
  created_at: string;
  performance_summary: {
    average_score: number;
    completion_reason: string;
    total_questions: number;
  };
}

// Performance analytics
export interface PerformanceAnalytics {
  total_interviews: number;
  average_performance: number;
  improvement_trend: string;
  agent_effectiveness: number;
}

// User interview history response
export interface UserInterviewHistoryResponse {
  user_id: string;
  interviews: UserHistoryItem[];
  performance_analytics: PerformanceAnalytics;
  recommendations: string[];
}

// End interview request
export interface EndInterviewRequest {
  interview_id: string;
  user_id: string;
}

// End interview response
export interface EndInterviewResponse {
  interview_id: string;
  status: string;
  final_evaluation: {
    summary: string;
    overall_score: number;
    strengths: string[];
    improvements: string[];
  };
  message: string;
}

// Legacy types for backward compatibility
export interface StartInterviewRequestV2 {
  user_id: string;
  interview_type: string;
  job_description?: string;
  expertise_level?: string;
  interviewer_persona?: string;
  max_questions?: number | null;
}

export interface StartInterviewResponseV2 {
  interview_id: string;
  question: string;
}

export interface ProcessTurnRequest {
  user_id: string;
  audio_file?: File;
  text_response?: string;
  response_duration_seconds?: number;
}

export interface ProcessTurnResponse {
  next_question?: string;
  is_complete: boolean;
  transcription?: string;
  feedback?: any;
}

export interface HistoryRequest {
  user_id: string;
}

export interface HistoryResponse {
  turns: Array<{
    turn_index: number;
    speaker: 'AI' | 'User';
    text: string;
    feedback?: any;
  }>;
}

export interface AgentInteractionResponse {
  next_question: string | null;
  overall_feedback: any | null;
  conversation_id?: string;
  transcription?: string;
}

// Technical Speech Analysis Types
export interface TechnicalSpeechAnalysisRequest {
  interview_id: string;
}

export interface PauseAnalysis {
  average_pause_duration: number;
  excessive_pauses: number;
}

export interface ConfidenceIndicators {
  assertive_language: number;
  hedging: number;
}

export interface SpeechMetrics {
  // Speech Pattern Analysis
  speaking_rate_wpm: number;
  speech_pace_consistency: number;
  filler_word_count: number;
  filler_word_percentage: number;
  pause_analysis: PauseAnalysis;
  pace_consistency: number;
  repeated_phrases: number;
  
  // Vocabulary & Language Quality
  vocabulary_richness_score: number;
  unique_word_count: number;
  repeated_phrase_count: number;
  action_verb_count: number;
  technical_term_usage: number;
  
  // Content Structure Analysis
  star_adherence_score: number;
  response_organization_score: number;
  clarity_score: number;
  conciseness_score: number;
  
  // Communication Effectiveness # TODO
  confidence_indicators: number;
  engagement_score: number;
  professional_tone_score: number;
}

export interface TechnicalSpeechAnalysisResponse {
  interview_id: string;
  total_duration_minutes: number;
  total_word_count: number;
  metrics: SpeechMetrics;
  overall_speech_grade: string;
  key_recommendations: string[];
}
