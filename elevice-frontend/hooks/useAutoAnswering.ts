import { useState, useCallback } from "react"
import type { InterviewType, ExpertiseLevel } from "@/types/interview"
import type { InterviewApiService } from "@/services/api/interview"
import { extractAutoAnswerAndDuration, createUserErrorMessage } from "@/utils/interview"

export interface UseAutoAnsweringProps {
  interviewApiService: InterviewApiService;
  interviewType: InterviewType;
  conversation?: any[];
  userId?: string;
  expertiseLevel?: ExpertiseLevel;
}

export const useAutoAnswering = ({
  interviewApiService,
  interviewType,
  conversation,
  userId,
  expertiseLevel
}: UseAutoAnsweringProps) => {
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [autoAnswerError, setAutoAnswerError] = useState<string | null>(null);

  // Request automatic answer from backend
  const generateAutomaticAnswer = useCallback(async (question: string, durationSeconds?: number) => {
    setIsGeneratingAnswer(true);
    setAutoAnswerError(null);
    try {
      const result = await interviewApiService.getAutomaticAnswer(
        question,
        interviewType,
        conversation,
        userId,
        durationSeconds,
        expertiseLevel
      );
      // Optionally extract answer and duration
      const { answer, duration } = extractAutoAnswerAndDuration(result);
      return { answer, duration, raw: result };
    } catch (error) {
      setAutoAnswerError(createUserErrorMessage(error, "Failed to generate automatic answer."));
      throw error;
    } finally {
      setIsGeneratingAnswer(false);
    }
  }, [interviewApiService, interviewType, conversation, userId, expertiseLevel]);

  return {
    generateAutomaticAnswer,
    isGeneratingAnswer,
    autoAnswerError,
  };
};
