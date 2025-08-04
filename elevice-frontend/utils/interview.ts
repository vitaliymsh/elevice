import { type InterviewType } from "@/types/interview"

/**
 * Interview-related utility functions
 */

// Helper function to map interview type to difficulty level
export const getDifficultyLevel = (type: InterviewType): string => {
  const difficultyMap = {
    "general": "junior",
    "software-engineer": "intermediate", 
    "product-manager": "intermediate",
    "sales-representative": "junior",
    "project-manager": "intermediate",
    "business-analyst": "intermediate",
  };
  return difficultyMap[type] || "intermediate";
};

// Helper function to map interview type to backend format
export const getBackendInterviewType = (type: InterviewType): string => {
  const typeMap = {
    "general": "General",
    "software-engineer": "Software Engineer", 
    "product-manager": "Product Manager",
    "sales-representative": "Sales Representative",
    "project-manager": "Project Manager",
    "business-analyst": "Business Analyst",
  };
  return typeMap[type] || type;
};

// Get job description based on interview type
export const getJobDescription = (type: InterviewType): string => {
  const descriptions = {
    "general": "General position requiring strong communication and problem-solving skills",
    "software-engineer": "Full-stack software engineer with experience in modern web technologies, APIs, and system design",
    "product-manager": "Product manager with experience in roadmap planning, stakeholder management, and data-driven decision making",
    "sales-representative": "Sales representative with proven track record in customer relationship management and revenue generation",
    "project-manager": "Project manager with expertise in agile methodologies, team coordination, and delivery management",
    "business-analyst": "Business analyst with skills in requirements gathering, process optimization, and stakeholder communication"
  };
  return descriptions[type] || descriptions["general"];
};


// Get display name for interview type (for display purposes)
export const getInterviewTypeDisplay = (type: string): string => {
  const displayMap = {
    "general": "General Interview",
    "software-engineer": "Software Engineer",
    "product-manager": "Product Manager", 
    "sales-representative": "Sales Representative",
    "project-manager": "Project Manager",
    "business-analyst": "Business Analyst"
  };
  return displayMap[type as InterviewType] || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// --- Interview session utility functions ---
import type { ConversationItem, EvaluationResponse } from "@/types/interview";
import type { InterviewState } from "@/types/api/api";
import type { Session } from "@/types/interview";

export const createUserResponse = (textResponse: string, feedback?: EvaluationResponse): ConversationItem => ({
  speaker: "candidate",
  text: textResponse,
  feedback
});

export const createAIQuestion = (questionText: string): ConversationItem => ({
  speaker: "interviewer",
  text: questionText
});

export const createPlaceholderResponse = (): ConversationItem => ({
  speaker: "candidate",
  text: "",
  isPlaceholder: true
});

export const createUserErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
};

export const validateInterviewSession = (
  currentInterviewId: string | null,
  interviewState: InterviewState | null
): currentInterviewId is string => {
  if (!currentInterviewId || !interviewState) {
    throw new Error("No active interview session");
  }
  return true;
};

export const validateUserId = (userId: string | null | undefined): userId is string => {
  if (!userId) {
    throw new Error("User ID not available");
  }
  return true;
};

export const extractAutoAnswerAndDuration = (automaticAnswer: unknown): { answer: string | null; duration: number | undefined } => {
  if (!automaticAnswer) return { answer: null, duration: undefined };
  if (typeof automaticAnswer === 'string') return { answer: automaticAnswer, duration: undefined };
  if (Array.isArray(automaticAnswer)) {
    const answerArray = automaticAnswer as Array<{ answer?: string; text?: string; duration_seconds?: number; duration?: number }>;
    if (answerArray.length > 0) {
      const joinedAnswer = answerArray.map(item => item.answer || item.text || '').filter(Boolean).join('\n\n');
      let totalDuration = 0;
      let foundDuration = false;
      for (const item of answerArray) {
        if (typeof item.duration_seconds === 'number') {
          totalDuration += item.duration_seconds;
          foundDuration = true;
        } else if (typeof item.duration === 'number') {
          totalDuration += item.duration;
          foundDuration = true;
        }
      }
      return {
        answer: joinedAnswer,
        duration: foundDuration ? totalDuration : undefined
      };
    }
    return { answer: null, duration: undefined };
  }
  if (typeof automaticAnswer === 'object' && automaticAnswer !== null) {
    const answerObj = automaticAnswer as { answer?: string; text?: string; duration_seconds?: number };
    return {
      answer: answerObj.answer || answerObj.text || null,
      duration: answerObj.duration_seconds
    };
  }
  return { answer: null, duration: undefined };
};

export const formatConversationTurns = (turns: any[]): ConversationItem[] => {
  return turns.map(turn => ({
    speaker: turn.speaker,
    text: turn.text,
    feedback: turn.feedback
  }));
};

export const createInterviewSession = (
  interviewId: string,
  interviewType: InterviewType,
  finalEvaluation: EvaluationResponse | null,
  conversation: ConversationItem[]
): Session => {
  const defaultEvaluation: EvaluationResponse = {
    summary: "Interview completed successfully.",
    strengths: ["Clear communication"],
    improvements: ["Continue practicing"],
    segment_feedback: []
  };

  return {
    id: interviewId,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit" 
    }),
    type: interviewType,
    outcome: "Interview Completed",
    feedback: finalEvaluation || defaultEvaluation,
    transcript: conversation,
  };
};

export const getInterviewTypeLabel = (type: string) => {
  return type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed': return "default"
    case 'in_progress': return "secondary"
    default: return "outline"
  }
}

