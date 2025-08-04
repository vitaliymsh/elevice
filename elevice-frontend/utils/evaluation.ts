/**
 * Evaluation and feedback utilities
 */

import { TechnicalSpeechAnalysisResponse } from "@/types";

export type FeedbackType = 'great' | 'warning' | 'improve' | 'clarify';

export interface SegmentFeedback {
  feedback_type: FeedbackType;
  text: string;
  start_position?: number;
  end_position?: number;
}

// Get color classes for feedback types
export const getFeedbackColor = (type: FeedbackType): string => {
  switch (type) {
    case 'great':
      return 'bg-green-100 border-green-300 text-green-800';
    case 'warning':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    case 'improve':
      return 'bg-red-100 border-red-300 text-red-800';
    case 'clarify':
      return 'bg-blue-100 border-blue-300 text-blue-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

// Get icon for feedback types
export const getFeedbackIcon = (type: FeedbackType): string => {
  switch (type) {
    case 'great':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'improve':
      return '🔴';
    case 'clarify':
      return '💭';
    default:
      return '📝';
  }
};

// Get outcome from evaluation data
export const getOutcomeFromEvaluation = (evaluation: any): string => {
  if (!evaluation) return "Completed"
  
  // Simple heuristic based on strengths vs improvements
  const strengths = evaluation.strengths?.length || 0
  const improvements = evaluation.improvements?.length || 0
  
  if (strengths > improvements) {
    return "Good Performance"
  } else if (strengths === improvements) {
    return "Mixed Results"
  } else {
    return "Needs Improvement"
  }
};

// Analyze metrics and provide status
export interface MetricStatus {
  status: string;
  color: string;
}

export const getSpeedStatus = (wpm: number): MetricStatus => {
  if (wpm < 120) return { status: 'Slow', color: 'text-orange-600 bg-orange-100' };
  if (wpm > 180) return { status: 'Fast', color: 'text-orange-600 bg-orange-100' };
  return { status: 'Good', color: 'text-green-600 bg-green-100' };
};

export const getFillerWordsStatus = (count: number): MetricStatus => {
  if (count === 0) return { status: 'Excellent', color: 'text-green-600 bg-green-100' };
  if (count <= 2) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (count <= 5) return { status: 'Fair', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Needs Work', color: 'text-red-600 bg-red-100' };
};

export const getStarScore = (score: number): MetricStatus => {
  const percentage = Math.round(score * 100);
  if (percentage >= 80) return { status: 'Excellent', color: 'text-green-600 bg-green-100' };
  if (percentage >= 60) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (percentage >= 40) return { status: 'Fair', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Needs Work', color: 'text-red-600 bg-red-100' };
};

export const getVocabularyStatus = (score: number): MetricStatus => {
  if (score >= 0.8) return { status: 'Rich', color: 'text-green-600 bg-green-100' };
  if (score >= 0.6) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (score >= 0.4) return { status: 'Fair', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Limited', color: 'text-red-600 bg-red-100' };
};


export const templateSpeechAnalysisData: TechnicalSpeechAnalysisResponse = {
    interview_id: "test-interview-123",
    total_duration_minutes: 12.5,
    total_word_count: 1847,
    overall_speech_grade: "B+",
    key_recommendations: [
      "Reduce filler words by pausing instead of using 'um' and 'uh'",
      "Maintain consistent speaking pace throughout responses",
      "Use more technical terminology to demonstrate expertise",
      "Structure responses using the STAR method for behavioral questions"
    ],
    metrics: {
      speaking_rate_wpm: 145,
      speech_pace_consistency: 0.78,
      filler_word_count: 23,
      filler_word_percentage: 1.25,
      pause_analysis: {
        average_pause_duration: 1.2,
        excessive_pauses: 3
      },
      pace_consistency: 0.8,
      repeated_phrases: 3,
      vocabulary_richness_score: 0.85,
      unique_word_count: 1234,
      repeated_phrase_count: 8,
      action_verb_count: 67,
      technical_term_usage: 15,
      star_adherence_score: 0.72,
      response_organization_score: 0.80,
      clarity_score: 0.88,
      confidence_indicators: 12,
      conciseness_score: 0.82,
      engagement_score: 0.76,
      professional_tone_score: 0.90
    }
  };