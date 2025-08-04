import { ChevronDown, Info } from "lucide-react";
import React from "react";
import type { ConversationItem } from "@/types/interview";
import HighlightedTranscript from "@/components/common/HighlightedTranscript";
import SessionSpeechAnalysis from "@/components/common/SessionSpeechAnalysis";
import { TechnicalSpeechAnalysisResponse } from "@/types";

const ConversationHistory = ({
  conversation,
  transcriptContainerRef,
  showScrollToBottom,
  scrollToBottom,
  currentQuestion,
  isPlayingAudio,
  replayCurrentQuestion,
  micState,
  errorMessage,
}: {
  conversation: ConversationItem[];
  transcriptContainerRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
  currentQuestion?: string;
  isPlayingAudio?: boolean;
  replayCurrentQuestion?: () => void;
  micState?: string;
  errorMessage?: string;
}) => {
  console.log(conversation, "ConversationHistory conversation data");

  // Find the most recent AI question for highlighting
  const mostRecentQuestionIndex = conversation.map((item, index) => ({ item, index }))
    .reverse()
    .find(({ item }) => item.speaker === 'interviewer')?.index;

  return (
    <div className="relative">
      <div
        ref={transcriptContainerRef}
        className="space-y-4"
      >
        {conversation.map((item, index) => {
          const isLatestQuestion = index === mostRecentQuestionIndex;
          
          return (
            <div key={index}>
              {/* AI Question */}
              {item.speaker === 'interviewer' && (
                <div className="flex justify-start mb-4">
                  <div className={`p-4 rounded-lg max-w-3xl transition-all duration-200 break-words ${
                    isLatestQuestion 
                      ? 'bg-[#4A6D7C] text-white shadow-lg' 
                      : 'bg-[#F0F1F1] text-[#4A6D7C] border border-gray-200'
                  }`}>
                    <div className="uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span>INTERVIEW QUESTION</span>
                      {isLatestQuestion && replayCurrentQuestion && !isPlayingAudio && !errorMessage && (
                        <button
                          onClick={replayCurrentQuestion}
                          className="ml-4 px-3 py-1 bg-white text-[#4A6D7C] text-xs rounded hover:bg-gray-100 transition-colors flex-shrink-0 uppercase tracking-wide"
                          title="Replay question audio"
                        >
                          🔊 REPLAY
                        </button>
                      )}
                    </div>
                    <div className="break-words">{item.text}</div>
                    {isLatestQuestion && isPlayingAudio && (
                      <div className={`text-sm mt-2 uppercase tracking-wide ${isLatestQuestion ? 'text-white' : 'text-[#4A6D7C]'}`}>
                        🎵 PLAYING AUDIO...
                      </div>
                    )}
                    {isLatestQuestion && errorMessage && (
                      <div className="text-red-300 text-sm mt-2 uppercase tracking-wide">
                        ⚠️ {errorMessage}
                      </div>
                    )}
                    {isLatestQuestion && micState === "generating" && (
                      <div className={`text-sm mt-2 uppercase tracking-wide ${isLatestQuestion ? 'text-white' : 'text-[#4A6D7C]'}`}>
                        ⏳ GENERATING QUESTION...
                      </div>
                    )}
                    {isLatestQuestion && micState === "processing" && (
                      <div className={`text-sm mt-2 uppercase tracking-wide ${isLatestQuestion ? 'text-white' : 'text-[#4A6D7C]'}`}>
                        🔄 PROCESSING YOUR RESPONSE...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Response */}
              {item.speaker === 'candidate' && (
                <div className="flex justify-end mb-4">
                  <div className="bg-white text-black p-4 rounded-lg max-w-3xl border border-gray-200 shadow-sm break-words flex items-start">
                    <div className="flex-1">
                      <div className="flex flex-row justify-between align-top">
                        <div className="uppercase tracking-wide mb-2 text-[#4A6D7C] text-xs">YOUR RESPONSE</div>
                        {/* Info button for feedback */}
                        {item.feedback && (
                          (item.feedback.summary || (item.feedback.strengths && item.feedback.strengths.length > 0) || (item.feedback.improvements && item.feedback.improvements.length > 0) || item.feedback.metrics) && (
                            <div className="ml-2 flex items-center justify-self-start">
                              <div className="relative group">
                                <Info 
                                  aria-label="Show feedback details"
                                  className="bg-[#F0F1F1] text-[#4A6D7C] rounded-full hover:bg-[#e2e3e3] transition-colors  shadow-md focus:outline-none focus:ring-2 focus:ring-[#4A6D7C] size-[75%]"
                                />
                                {/* Tooltip styled to match site */}
                                <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#F0F1F1] text-[#4A6D7C] rounded-xl shadow-2xl border border-[#4A6D7C] p-5 z-50 opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-all duration-200">
                                  <div className="font-semibold text-[#4A6D7C] mb-2 text-base tracking-wide">Feedback Summary</div>
                                  <div className="mb-2 text-[#4A6D7C] text-sm leading-relaxed">{item.feedback.summary || "No summary available."}</div>
                                  {item.feedback.strengths && item.feedback.strengths.length > 0 && (
                                    <div className="mb-2 text-green-700 text-xs font-medium">Strengths: {item.feedback.strengths.join(', ')}</div>
                                  )}
                                  {item.feedback.improvements && item.feedback.improvements.length > 0 && (
                                    <div className="mb-2 text-red-700 text-xs font-medium">Improvements: {item.feedback.improvements.join(', ')}</div>
                                  )}
                                  {item.feedback.metrics && (
                                    <div className="mt-3">
                                      <div className="font-semibold text-[#4A6D7C] mb-1 text-sm">Metrics</div>
                                      <div className="ml-2 text-xs text-[#4A6D7C]">
                                        {Object.entries(item.feedback.metrics).map(([key, value]) => (
                                          <div key={key} className="mb-1 flex items-center">
                                            <span className="font-medium text-blue-700 capitalize mr-2">{key.replace(/_/g, ' ')}:</span> <span className="text-[#4A6D7C]">{String(value)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                      
                      {item.isPlaceholder ? (
                        // Show loading animation for placeholder
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-[#4A6D7C] rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-[#4A6D7C] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-[#4A6D7C] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                          <span className="text-[#4A6D7C] text-sm uppercase tracking-wide">GENERATING RESPONSE...</span>
                        </div>
                      ) : (
                        // Show actual response content
                        <HighlightedTranscript 
                          text={item.text} 
                          feedback={item.feedback}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Show current question if it's not yet in conversation */}
        {currentQuestion && !conversation.some(item => item.speaker === 'interviewer' && item.text === currentQuestion) && (
          <div className="mb-4">
            <div className="flex justify-start">
              <div className="bg-[#4A6D7C] text-white shadow-lg p-4 rounded-lg max-w-3xl transition-all duration-200 break-words">
                <div className="uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>INTERVIEW QUESTION</span>
                  {replayCurrentQuestion && !isPlayingAudio && !errorMessage && (
                    <button
                      onClick={replayCurrentQuestion}
                      className="ml-4 px-3 py-1 bg-white text-[#4A6D7C] text-xs rounded hover:bg-gray-100 transition-colors flex-shrink-0 uppercase tracking-wide"
                      title="Replay question audio"
                    >
                      🔊 REPLAY
                    </button>
                  )}
                </div>
                <div className="break-words">{currentQuestion}</div>
                {isPlayingAudio && (
                  <div className="text-white text-sm mt-2 uppercase tracking-wide">
                    🎵 PLAYING AUDIO...
                  </div>
                )}
                {errorMessage && (
                  <div className="text-red-300 text-sm mt-2 uppercase tracking-wide">
                    ⚠️ {errorMessage}
                  </div>
                )}
                {micState === "generating" && (
                  <div className="text-white text-sm mt-2 uppercase tracking-wide">
                    ⏳ GENERATING QUESTION...
                  </div>
                )}
                {micState === "processing" && (
                  <div className="text-white text-sm mt-2 uppercase tracking-wide">
                    🔄 PROCESSING YOUR RESPONSE...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Waiting bubble for user response when mic is listening (not processing since placeholder handles that) */}
        {micState === "recording" && (
          <div key={`loading-${conversation.length}`} className="mb-4">
            <div className="flex justify-end">
              <div className="bg-white text-black p-4 rounded-lg max-w-3xl border border-gray-200 shadow-sm break-words">
                <div className="uppercase tracking-wide mb-2 text-[#4A6D7C] text-xs">YOUR RESPONSE</div>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#4A6D7C] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#4A6D7C] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-[#4A6D7C] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-[#4A6D7C] text-sm uppercase tracking-wide">LISTENING...</span>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Scroll to bottom button - positioned within chat area */}
      {showScrollToBottom && (
        <div className="fixed bottom-10 right-16 z-40">
          <button
            onClick={scrollToBottom}
            className="bg-[#4A6D7C] hover:bg-[#3A5A6B] text-white p-3 rounded-full shadow-lg transition-colors duration-200"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;
