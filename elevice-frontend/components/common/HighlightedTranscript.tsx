import React from 'react';
import type { EvaluationResponse, SegmentFeedback } from '@/types/interview';

interface HighlightedTranscriptProps {
  text: string;
  feedback?: EvaluationResponse;
}

export default function HighlightedTranscript({ text, feedback }: HighlightedTranscriptProps) {
  if (!feedback?.segment_feedback || feedback.segment_feedback.length === 0) {
    return <div className="text-gray-800">{text}</div>;
  }

  // Create highlighted text with hover tooltips
  const renderHighlightedText = () => {
    let highlightedText = text;
    const segments = [...feedback.segment_feedback].sort((a, b) => {
      // Sort by text length (longer segments first to avoid conflicts)
      return b.segment_text.length - a.segment_text.length;
    });

    segments.forEach((segment, index) => {
      const segmentText = segment.segment_text;
      const segmentIndex = highlightedText.indexOf(segmentText);
      
      if (segmentIndex !== -1) {
        const before = highlightedText.slice(0, segmentIndex);
        const after = highlightedText.slice(segmentIndex + segmentText.length);
        
        const colorClass = segment.feedback_type === 'great' ? 'bg-green-200 text-green-800' 
                          : segment.feedback_type === 'improve' ? 'bg-red-200 text-red-800'
                          : segment.feedback_type === 'warning' ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-blue-200 text-blue-800';
        
        const feedbackLabel = segment.feedback_type === 'great' ? 'Great!' 
                            : segment.feedback_type === 'improve' ? 'Needs Improvement'
                            : segment.feedback_type === 'warning' ? 'Watch Out'
                            : 'Note';
        
        // Escape quotes and newlines for HTML attributes
        const escapedComment = segment.comment.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, ' ');
        
        highlightedText = before + 
          `<span class="${colorClass} relative group cursor-help transition-all duration-200 hover:shadow-sm rounded px-1">
            ${segmentText}
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] max-w-sm">
              <div class="font-medium mb-2 text-yellow-300 text-base">${feedbackLabel}</div>
              <div class="text-gray-200 text-sm leading-relaxed">${escapedComment}</div>
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </span>` + 
          after;
      }
    });

    return { __html: highlightedText };
  };

  return (
    <div className="text-gray-800 leading-relaxed">
      <div dangerouslySetInnerHTML={renderHighlightedText()} />
    </div>
  );
}
