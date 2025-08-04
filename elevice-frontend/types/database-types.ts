// Database types for Supabase - aligned with actual schema
import type { ExpertiseLevel, InterviewerPersona } from './interview';

export interface DBJob {
  id: string;
  name: string;
  description?: string;
  position?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface DBInterview {
  interview_id: string;
  user_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  job_id?: string;
}

export interface DBInterviewParameters {
  id: string;
  parameters: {
    interview_type?: string;
    custom_job_description?: string;
    expertise_level?: ExpertiseLevel;
    interviewer_persona?: InterviewerPersona;
    max_questions?: number;
    is_auto_answering?: boolean;
  } | null;
}

// Combined interface for interview with parameters
export interface DBInterviewWithParameters extends DBInterview {
  interview_type: string;
  custom_job_description?: string;
  expertise_level: ExpertiseLevel;
  interviewer_persona: InterviewerPersona;
  max_questions?: number;
  is_auto_answering: boolean;
  // Keep these for backward compatibility with existing hooks
  final_evaluation?: any;
  last_updated_at: string;
}

export interface DBInterviewTurn {
  turn_id: string;
  interview_id: string;
  turn_index: number;
  speaker: string;
  text: string;
  feedback?: any;
  created_at: string;
}

export interface DBUserSession {
  user_id: string;
  created_at: string;
  last_active: string;
}

// Extended interview data for the new setup process (stored in final_evaluation or separate fields)
export interface InterviewSetupData {
  jobTitle?: string;
  jobPosition?: string;
  jobDescription?: string;
  interviewLength?: number;
  responseMode?: 'voice' | 'auto';
  skillLevel?: ExpertiseLevel;
  interviewerPersona?: InterviewerPersona;
}