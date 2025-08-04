import React from 'react';
import type { MetricData } from '@/types/interview';
import type { TechnicalSpeechAnalysisResponse } from '@/types/api/api';
import { BarChart, Zap, Repeat } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface SessionSpeechAnalysisProps {
  speechAnalysis?: TechnicalSpeechAnalysisResponse;
  metrics?: MetricData;
}

const getIndicatorColor = (status: string) => {
  switch (status) {
    case 'good': return 'text-green-500';
    case 'fair': return 'text-yellow-500';
    case 'poor': return 'text-red-500';
    default: return 'text-gray-400';
  }
};

const SessionSpeechAnalysis = ({ speechAnalysis }: SessionSpeechAnalysisProps) => {
  if (!speechAnalysis) {
    return null;
  }

  const effectiveMetrics = speechAnalysis.metrics;

  if (!effectiveMetrics) {
    return null;
  }

  const speakingRate = effectiveMetrics.speaking_rate_wpm !== undefined ? {
    value: `${Math.round(effectiveMetrics.speaking_rate_wpm)} WPM`,
    status: effectiveMetrics.speaking_rate_wpm >= 120 && effectiveMetrics.speaking_rate_wpm <= 160 ? 'good' : 'fair',
    description: `Speaking rate is ${Math.round(effectiveMetrics.speaking_rate_wpm)} WPM. Aim for 120-160 WPM.`,
  } : null;

  const actionVerbCount = effectiveMetrics.action_verb_count !== undefined ? {
    value: effectiveMetrics.action_verb_count,
    status: effectiveMetrics.action_verb_count >= 3 ? 'good' : effectiveMetrics.action_verb_count >= 1 ? 'fair' : 'poor',
    description: `${effectiveMetrics.action_verb_count} action verbs used. Use dynamic language!`,
  } : null;

  const fillerWordPercentage = effectiveMetrics.filler_word_percentage !== undefined ? {
    value: `${effectiveMetrics.filler_word_percentage.toFixed(1)}%`,
    status: effectiveMetrics.filler_word_percentage <= 5 ? 'good' : effectiveMetrics.filler_word_percentage <= 10 ? 'fair' : 'poor',
    description: `${effectiveMetrics.filler_word_percentage.toFixed(1)}% filler words. Keep it under 5%.`,
  } : null;

  const tooltipContent = (
    <div className="text-gray-700">
      <div className="font-semibold text-[#4A6D7C] mb-3 uppercase tracking-wide">Speech Analysis</div>
      <ul className="space-y-3 text-sm">
        {speakingRate && (
          <li className="flex items-start gap-3">
            <BarChart className={`w-4 h-4 mt-0.5 ${getIndicatorColor(speakingRate.status)}`} />
            <span>{speakingRate.description}</span>
          </li>
        )}
        {actionVerbCount && (
          <li className="flex items-start gap-3">
            <Zap className={`w-4 h-4 mt-0.5 ${getIndicatorColor(actionVerbCount.status)}`} />
            <span>{actionVerbCount.description}</span>
          </li>
        )}
        {fillerWordPercentage && (
          <li className="flex items-start gap-3">
            <Repeat className={`w-4 h-4 mt-0.5 ${getIndicatorColor(fillerWordPercentage.status)}`} />
            <span>{fillerWordPercentage.description}</span>
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div className="flex items-center gap-6 cursor-help">
        {/* Speaking Rate */}
        {speakingRate && (
          <div className="flex items-center gap-2">
            <BarChart className={`w-4 h-4 ${getIndicatorColor(speakingRate.status)}`} />
            <span className="text-sm font-medium text-[#4A6D7C]">{speakingRate.value}</span>
          </div>
        )}

        {/* Action Verb Count */}
        {actionVerbCount && (
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${getIndicatorColor(actionVerbCount.status)}`} />
            <span className="text-sm font-medium text-[#4A6D7C]">{actionVerbCount.value}</span>
          </div>
        )}

        {/* Filler Word Percentage */}
        {fillerWordPercentage && (
          <div className="flex items-center gap-2">
            <Repeat className={`w-4 h-4 ${getIndicatorColor(fillerWordPercentage.status)}`} />
            <span className="text-sm font-medium text-[#4A6D7C]">{fillerWordPercentage.value}</span>
          </div>
        )}
      </div>
    </Tooltip>
  );
};

export default SessionSpeechAnalysis;
