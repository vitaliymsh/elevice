"use client"

import SessionPageHeader from '@/app/interview-session/[id]/components/Header';

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useParams } from "next/navigation"
import { useInterviewSession } from "@/hooks/interview/useInterviewSession"
import { useUserSession } from "@/hooks/useUserSession"
import { DatabaseService } from "@/services/database"
import type { DBInterviewReport } from "@/services/database/interviewReports"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, TrendingUp, Star, AlertCircle, MessageSquare } from 'lucide-react'

// Import components
import ConversationHistory from "@/app/interview-session/[id]/components/ConversationHistory"
import MicrophoneButton from "@/components/common/MicrophoneButton"
import { useScrollManagement } from "@/hooks/useScrollManagement"
import SessionSpeechAnalysis from '@/components/common/SessionSpeechAnalysis';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

export default function InterviewSessionPage() {
  const router = useRouter()
  const params = useParams()
  const { userId, isInitialized } = useUserSession()
  const [questionIndex, setQuestionIndex] = useState<number>(0)

  

  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [interviewReport, setInterviewReport] = useState<DBInterviewReport | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false)
  const interviewId = params.id as string

  // Use the new interview session hook
  const { state, actions } = useInterviewSession({
    interviewId,
    apiUrl: BACKEND_API_URL,
    userId: isInitialized ? userId : null,
    onComplete: async (sessionData: import("@/types/types").InterviewSessionData) => {
      console.log("📄 Interview completed:", sessionData)

      // Load the interview report instead of redirecting
      await loadInterviewReport()
    }
  })

  console.log(state.speechAnalysis)

  // console.log(state)

  // Don't show errors until user session is initialized
  const shouldShowError = isInitialized && state.error

  useEffect(() => {
    const interviewerCount = state.conversation.filter((item: import("@/types/interview").ConversationItem) => item.speaker === "interviewer").length;
    setQuestionIndex(interviewerCount);
  }, [state.conversation.length]);



  // Load job title when session data is available
  useEffect(() => {
    const loadJobTitle = async () => {
      if (!state.sessionData?.job_id || !userId) return
      
      try {
        console.log("📄 Loading job information...");
        const job = await DatabaseService.getJobById(state.sessionData.job_id, userId);
        console.log("📄 Job result:", job);
        if (job) {
          console.log("✅ Job title set:", job.title);
          setJobTitle(job.title);
        }
      } catch (err) {
        console.error('❌ Error loading job title:', err);
      }
    }
    
    loadJobTitle();
  }, [state.sessionData?.job_id, userId])

  // console.log(state.conversation)

  // Function to load interview report
  const loadInterviewReport = async () => {
    if (!interviewId) return
    
    setIsLoadingReport(true)
    try {
      console.log("📄 Loading interview report for interview:", interviewId)
      const report = await DatabaseService.getInterviewReport(interviewId)
      if (report) {
        console.log("✅ Interview report loaded:", report)
        setInterviewReport(report)
      } else {
        console.log("⚠️ No interview report found for session:", interviewId)
      }
    } catch (error) {
      console.error('❌ Error loading interview report:', error)
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Load interview report if the interview is already completed
  useEffect(() => {
    if (state.sessionData?.status === 'completed' && !interviewReport && !isLoadingReport) {
      loadInterviewReport()
    }
  }, [state.sessionData?.status, interviewReport, isLoadingReport])

  const { transcriptContainerRef, showScrollToBottom, scrollToBottom } = useScrollManagement(
    state.conversation,
    [state.micState, state.currentQuestion] // Additional dependencies
  )

  const handleBack = () => {
    router.push('/')
  }

  const handleEndInterview = () => {
    if (confirm('Are you sure you want to end this interview session?')) {
      actions.completeInterview()
    }
  }

  const getAssessmentColor = (assessment: string) => {
    if (assessment.toLowerCase().includes('excellent') || assessment.toLowerCase().includes('strong')) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (assessment.toLowerCase().includes('good') || assessment.toLowerCase().includes('satisfactory')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (assessment.toLowerCase().includes('borderline') || assessment.toLowerCase().includes('needs')) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    } else {
      return 'bg-red-50 text-red-700 border-red-200';
    }
  }


  // TTS audio playback management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayError, setAudioPlayError] = useState<string | null>(null);

  // Auto-play TTS audio when URL changes and user has interacted
  useEffect(() => {
    if (state.ttsAudioUrl && audioRef.current) {
      audioRef.current.src = state.ttsAudioUrl;
      setAudioPlayError(null);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlayingAudio(true);
          actions.setMicState('playing');
        }).catch((err) => {
          setAudioPlayError('Audio playback failed: ' + err.message);
          console.warn('Audio playback failed:', err);
        });
      }
    }
  }, [state.ttsAudioUrl]);

  // Audio event handlers
  const handleAudioPlay = () => {
    setIsPlayingAudio(true);
    actions.setMicState('playing');
  };
  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    actions.setMicState('idle');
  };
  const handleAudioPause = () => {
    setIsPlayingAudio(false);
    actions.setMicState('idle');
  };

  // Replay current question (for TTS)
  const handleReplayCurrentQuestion = () => {
    const currentQuestion = state.currentQuestion;
    if (currentQuestion) {
      actions.playAudio(currentQuestion);
    }
  };

  // Microphone click: stop audio playback if playing, else normal logic
  const handleMicrophoneClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      actions.setMicState('idle');
      return;
    }
    // ...existing code...
    if (event.shiftKey && state.canGenerateAutoReply) {
      actions.generateAutoReply();
    } else if (state.canRecord) {
      actions.startRecording();
    } else if (state.canStopRecord) {
      actions.stopRecording();
    }
  };

  if (state.loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-[#F0F1F1] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#4A6D7C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-xl text-[#4A6D7C] uppercase tracking-wide">LOADING INTERVIEW SESSION...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (shouldShowError) {
    return (
      <div className="min-h-screen bg-[#F0F1F1] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-2xl text-red-600 uppercase tracking-wide mb-4">ERROR</div>
              <div className="text-[#4A6D7C] mb-8">{state.error}</div>
              <button
                onClick={actions.clearError}
                className="bg-[#4A6D7C] text-white px-6 py-2 uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0 mr-4"
              >
                RETRY
              </button>
              <button
                onClick={handleBack}
                className="bg-gray-500 text-white px-6 py-2 uppercase tracking-wide hover:bg-gray-600 transition-colors duration-200 border-0"
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!state.sessionData) {
    return (
      <div className="min-h-screen bg-[#F0F1F1] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-2xl text-red-600 uppercase tracking-wide mb-4">SESSION NOT FOUND</div>
              <div className="text-[#4A6D7C] mb-8">
                The interview session you're looking for doesn't exist or you don't have access to it.
              </div>
              <button
                onClick={handleBack}
                className="bg-[#4A6D7C] text-white px-6 py-2 uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0"
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main interview interface
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="h-screen bg-[#F0F1F1] flex flex-col">
        {/* Audio element for TTS playback (force re-render on src change) */}
        <audio
          key={state.ttsAudioUrl || 'no-audio'}
          ref={audioRef}
          style={{ width: 0, height: 0, opacity: 0 }}
          preload="none"
          onPlay={handleAudioPlay}
          onEnded={handleAudioEnded}
          onPause={handleAudioPause}
          src={state.ttsAudioUrl || undefined}
          controls={!!audioPlayError}
        />
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0">
          <SessionPageHeader
            onBack={handleBack}
            questionIndex={questionIndex}
            totalQuestions={state.sessionData.max_questions || 10}
            isMockMode={false}
            backendStatus={state.backendConnected ? 'connected' : 'error'}
            onStopInterview={handleEndInterview}
            jobTitle={jobTitle || undefined}
            speechAnalysis={state.speechAnalysis}
            isCompleted={state.sessionData.status === 'completed'}
          />
        </div>

        {/* Main Chat Area - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto relative">
            <div className="max-w-4xl mx-auto p-4">
              {/* Start Interview Button */}
              {state.canStartInterview && (
                <div className="bg-white p-6 shadow-lg mb-4 rounded-lg text-center">
                  <h2 className="text-xl text-black mb-3 uppercase tracking-wide">
                    READY TO BEGIN
                  </h2>
                  <p className="text-[#4A6D7C] mb-4">
                    Your {state.sessionData.interview_type} interview
                    {jobTitle && ` for ${jobTitle}`} is ready to start.
                    Click the "START INTERVIEW" button below to begin.
                    {state.sessionData.is_auto_answering
                      ? " Once started, click the microphone to auto-generate answers or Shift+Click for auto-reply."
                      : " Once started, you'll be recording your responses."
                    }
                  </p>
                  <details className="mb-4 text-left">
                    <summary className="cursor-pointer text-[#4A6D7C] uppercase tracking-wide text-sm">Debug Info</summary>
                    <div className="mt-2 p-3 bg-[#F0F1F1] border text-sm">
                      <p>Backend Status: <span className={state.backendConnected ? 'text-green-600' : 'text-red-600'}>{state.backendConnected ? 'connected' : 'error'}</span></p>
                      <p>Mic State: {state.micState}</p>
                      <p>Can Start Interview: {state.canStartInterview ? 'Yes' : 'No'}</p>
                      <p>Interview Status: <span className="font-mono">{state.sessionData.status}</span></p>
                      <p>Auto Answering: {state.sessionData.is_auto_answering ? 'Yes' : 'No'}</p>
                      <p>Session ID: <span className="font-mono text-xs">{interviewId}</span></p>
                      <p>API URL: {BACKEND_API_URL}</p>
                      {state.error && <p className="text-red-600">Error: {state.error}</p>}
                    </div>
                  </details>
                  <button
                    onClick={actions.startInterview}
                    className="bg-[#4A6D7C] text-white px-8 py-3 rounded-lg uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200"
                  >
                    Start Interview
                  </button>
                </div>
              )}

              {/* Completed Interview with Report */}
              {state.isReadOnly && interviewReport && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-wide">Questions</CardTitle>
                        <Target className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{interviewReport.total_questions}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-wide">Duration</CardTitle>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {interviewReport.interview_duration_minutes ? `${Math.round(interviewReport.interview_duration_minutes)}m` : 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-wide">Avg Score</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{interviewReport.average_score}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium uppercase tracking-wide">Confidence</CardTitle>
                        <Star className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {interviewReport.confidence_score ? `${interviewReport.confidence_score}%` : 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overall Assessment Banner */}
                  <Card className={`border ${getAssessmentColor(interviewReport.overall_assessment)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center mb-3">
                        <AlertCircle className="w-6 h-6 mr-3" />
                        <h2 className="text-xl font-semibold uppercase tracking-wide">Overall Assessment</h2>
                      </div>
                      <p className="text-lg font-medium">{interviewReport.overall_assessment}</p>
                    </CardContent>
                  </Card>

                  {/* Tabbed Content */}
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 h-12">
                      <TabsTrigger value="summary" className="uppercase tracking-wide text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#4A6D7C] data-[state=active]:shadow-sm">Summary</TabsTrigger>
                      <TabsTrigger value="detailed" className="uppercase tracking-wide text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#4A6D7C] data-[state=active]:shadow-sm">Detailed</TabsTrigger>
                      <TabsTrigger value="metrics" className="uppercase tracking-wide text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#4A6D7C] data-[state=active]:shadow-sm">Metrics</TabsTrigger>
                      <TabsTrigger value="history" className="uppercase tracking-wide text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#4A6D7C] data-[state=active]:shadow-sm">Chat History</TabsTrigger>
                    </TabsList>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="space-y-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="uppercase tracking-wide">Performance Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 leading-relaxed">{interviewReport.performance_summary}</p>
                        </CardContent>
                      </Card>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border-green-200 bg-green-50">
                          <CardHeader>
                            <CardTitle className="text-green-800 uppercase tracking-wide flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                              Key Strengths
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-3">
                              {interviewReport.key_strengths?.map((strength, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-green-500 mr-2 mt-1">✓</span>
                                  <span className="text-gray-700">{strength}</span>
                                </li>
                              )) || <li className="text-gray-500 italic">No key strengths data available</li>}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-orange-200 bg-orange-50">
                          <CardHeader>
                            <CardTitle className="text-orange-800 uppercase tracking-wide flex items-center">
                              <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                              Areas for Improvement
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-3">
                              {interviewReport.areas_for_improvement?.map((improvement, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-orange-500 mr-2 mt-1">→</span>
                                  <span className="text-gray-700">{improvement}</span>
                                </li>
                              )) || <li className="text-gray-500 italic">No improvement areas data available</li>}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Detailed Analysis Tab */}
                    <TabsContent value="detailed" className="space-y-6 mt-6">
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-blue-800 uppercase tracking-wide">Hiring Recommendation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 leading-relaxed">{interviewReport.hiring_recommendation}</p>
                        </CardContent>
                      </Card>

                      {interviewReport.improvement_recommendations?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="uppercase tracking-wide">Improvement Recommendations</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {interviewReport.improvement_recommendations?.map((recommendation, index) => (
                              <div key={index} className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                                <div className="flex items-start">
                                  <span className="text-yellow-600 mr-2 mt-1">💡</span>
                                  <span className="text-gray-700">{recommendation}</span>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {interviewReport.follow_up_areas?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="uppercase tracking-wide">Follow-up Areas</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {interviewReport.follow_up_areas?.map((area, index) => (
                              <div key={index} className="bg-purple-50 border border-purple-200 p-4 rounded">
                                <div className="flex items-start">
                                  <span className="text-purple-600 mr-2 mt-1">🔍</span>
                                  <span className="text-gray-700">{area}</span>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Engagement Metrics Tab */}
                    <TabsContent value="metrics" className="space-y-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="uppercase tracking-wide">Question Types Coverage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(interviewReport.question_types_covered || {}).map(([type, count]) => (
                              <Card key={type} className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4 text-center">
                                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                                  <div className="text-sm text-blue-700 uppercase tracking-wide">{type}</div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="uppercase tracking-wide">Engagement Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(interviewReport.engagement_metrics || {}).map(([metric, value]) => (
                              <Card key={metric} className="bg-green-50 border-green-200">
                                <CardContent className="p-4">
                                  <div className="text-lg font-semibold text-green-800 capitalize">
                                    {metric.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-2xl font-bold text-green-600">
                                    {typeof value === 'number' ? value.toFixed(1) : value}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="uppercase tracking-wide">Interview Completion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {interviewReport.completion_reason?.replace(/_/g, ' ') || 'Unknown'}
                            </Badge>
                            <span className="text-gray-600">Completion Reason</span>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Chat History Tab */}
                    <TabsContent value="history" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="uppercase tracking-wide flex items-center">
                            <MessageSquare className="w-5 h-5 mr-2" />
                            Interview Conversation
                          </CardTitle>
                          <CardDescription>
                            Complete conversation history from your interview session
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div
                            ref={transcriptContainerRef}
                            className="space-y-4 max-h-96 overflow-y-auto"
                          >
                            <ConversationHistory
                              conversation={state.conversation}
                              currentQuestion={state.currentQuestion || undefined}
                              transcriptContainerRef={transcriptContainerRef}
                              showScrollToBottom={showScrollToBottom}
                              scrollToBottom={scrollToBottom}
                              isPlayingAudio={isPlayingAudio}
                              replayCurrentQuestion={handleReplayCurrentQuestion}
                              micState={state.micState}
                              errorMessage={state.error || undefined}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  {/* Missing Fields Notice */}
                  {(() => {
                    const missingFields = [];
                    if (!interviewReport.key_strengths || interviewReport.key_strengths.length === 0) missingFields.push('Key Strengths');
                    if (!interviewReport.areas_for_improvement || interviewReport.areas_for_improvement.length === 0) missingFields.push('Areas for Improvement');
                    if (!interviewReport.improvement_recommendations || interviewReport.improvement_recommendations.length === 0) missingFields.push('Improvement Recommendations');
                    if (!interviewReport.follow_up_areas || interviewReport.follow_up_areas.length === 0) missingFields.push('Follow-up Areas');
                    if (!interviewReport.question_types_covered || Object.keys(interviewReport.question_types_covered).length === 0) missingFields.push('Question Types Coverage');
                    if (!interviewReport.engagement_metrics || Object.keys(interviewReport.engagement_metrics).length === 0) missingFields.push('Engagement Metrics');
                    if (!interviewReport.completion_reason) missingFields.push('Completion Reason');
                    
                    return missingFields.length > 0 ? (
                      <Card className="mt-6 border-gray-300 bg-gray-50">
                        <CardHeader>
                          <CardTitle className="uppercase tracking-wide text-gray-600 text-sm">Incomplete Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-500 text-sm mb-2">The following sections have missing or incomplete data:</p>
                          <div className="flex flex-wrap gap-2">
                            {missingFields.map((field, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">{field}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Loading report message */}
              {state.isReadOnly && isLoadingReport && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg text-blue-800 mb-4 uppercase tracking-wide">
                      Loading Interview Report
                    </h3>
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-600">
                      Generating your interview report...
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Read-only notice for completed interviews without report */}
              {state.isReadOnly && !interviewReport && !isLoadingReport && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg text-blue-800 mb-4 uppercase tracking-wide">
                      Completed Interview
                    </h3>
                    <p className="text-blue-600 mb-4">
                      This interview has been completed. You are viewing the conversation history in read-only mode.
                    </p>
                    <div
                      ref={transcriptContainerRef}
                      className="space-y-4 max-h-96 overflow-y-auto"
                    >
                      <ConversationHistory
                        conversation={state.conversation}
                        currentQuestion={state.currentQuestion || undefined}
                        transcriptContainerRef={transcriptContainerRef}
                        showScrollToBottom={showScrollToBottom}
                        scrollToBottom={scrollToBottom}
                        isPlayingAudio={isPlayingAudio}
                        replayCurrentQuestion={handleReplayCurrentQuestion}
                        micState={state.micState}
                        errorMessage={state.error || undefined}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation History for active interviews */}
              {!state.isReadOnly && (
                <div>
                  {/* Speech Analysis Sticky Overlay */}

                  {state.speechAnalysis && (
                    <div className="sticky top-2 flex justify-center mb-4 z-10">
                      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg px-3 py-2 shadow-sm">
                        <SessionSpeechAnalysis speechAnalysis={state.speechAnalysis} />
                      </div>
                    </div>
                  )}
                  
                  <div
                    ref={transcriptContainerRef}
                    className="space-y-4"
                  >
                    <ConversationHistory
                      conversation={state.conversation}
                      currentQuestion={state.currentQuestion || undefined}
                      transcriptContainerRef={transcriptContainerRef}
                      showScrollToBottom={showScrollToBottom}
                      scrollToBottom={scrollToBottom}
                      isPlayingAudio={isPlayingAudio}
                      replayCurrentQuestion={handleReplayCurrentQuestion}
                      micState={state.micState}
                      errorMessage={state.error || undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          {state.canInteract && (
            <div className="flex-shrink-0 border-t border-gray-200 bg-white">
              <div className="max-w-4xl mx-auto p-4 flex justify-center">
                <MicrophoneButton
                  micState={state.micState}
                  isInterviewStarted={!state.canStartInterview}
                  backendStatus={state.backendConnected ? 'connected' : 'error'}
                  onClick={handleMicrophoneClick}
                  isAutoAnswering={state.sessionData?.is_auto_answering || false}
                  isPlayingAudio={isPlayingAudio}
                  disabled={!state.canInteract}
                  disabledMessage={!state.canInteract ? 'INTERVIEW COMPLETED' : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}
