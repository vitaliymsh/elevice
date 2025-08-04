"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useJobs } from "@/hooks/useJobs"
import { useUserSession } from "@/hooks/useUserSession"
import { DatabaseService } from "@/services/database"

// Import slide components
import JobSelectionSlide from "./components/JobSelectionSlide"
import SettingsSlide from "./components/SettingsSlide"
import ReviewSlide from "./components/ReviewSlide"
import { SetupData } from "@/types"
import InterviewerStyleSlide from "./components/InterviewerStyleSlide"
import InterviewTypeSlide from "./components/InterviewTypeSlide"


function InterviewSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')

  const { userId } = useUserSession()
  const { jobs, loading: jobsLoading, getJobById } = useJobs(userId)

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isLoadingPreselectedJob, setIsLoadingPreselectedJob] = useState(false)

  const [setupData, setSetupData] = useState<SetupData>({
    selectedJob: null,
    useExistingJob: true,
    customJobDescription: "",
    interviewType: "general",
    expertiseLevel: "foundational",
    interviewerPersona: "friendly",
    maxQuestions: 5,
    isAutoAnswering: true,
  })

  // Load preselected job if jobId is provided in URL
  useEffect(() => {
    const loadPreselectedJob = async () => {
      if (jobId && userId) {
        setIsLoadingPreselectedJob(true)
        try {
          const job = await getJobById(jobId)
          if (job) {
            setSetupData(prev => ({
              ...prev,
              selectedJob: job,
              useExistingJob: true
            }))
            setCurrentSlide(1)
          }
        } catch (error) {
          console.error('Failed to load preselected job:', error)
        } finally {
          setIsLoadingPreselectedJob(false)
        }
      }
    }
    loadPreselectedJob()
  }, [jobId, userId])

  const slides = [
    { component: JobSelectionSlide, title: "Job Selection" },
    { component: InterviewTypeSlide, title: "Interview Type" },
    { component: InterviewerStyleSlide, title: "Interviewer Style" },
    { component: SettingsSlide, title: "Settings" },
    { component: ReviewSlide, title: "Review & Start" },
  ]

  const updateSetupData = (updates: Partial<SetupData>) => {
    setSetupData(prev => ({ ...prev, ...updates }))
  }

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleBack = () => {
    if (currentSlide === 0) {
      router.push("/")
    } else {
      prevSlide()
    }
  }

  const createInterviewSession = async () => {
    setIsCreatingSession(true)
    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }
      const interview = await DatabaseService.createInterview({
        userId,
        jobId: setupData.selectedJob?.id,
        interviewType: setupData.interviewType,
        customJobDescription: setupData.useExistingJob ? undefined : setupData.customJobDescription,
        expertiseLevel: setupData.expertiseLevel,
        interviewerPersona: setupData.interviewerPersona,
        maxQuestions: setupData.maxQuestions || undefined,
        isAutoAnswering: setupData.isAutoAnswering,
      });
      
      // Cache is automatically invalidated by DatabaseService.createInterview
      
      router.push(`/interview-session/${interview.interview_id}`)
    } catch (error) {
      console.error('Error creating interview session:', error)
      alert('Failed to create interview session. Please try again.')
    } finally {
      setIsCreatingSession(false)
    }
  }

  const CurrentSlideComponent = slides[currentSlide].component

  if (isLoadingPreselectedJob) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F0F1F1]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#4A6D7C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A6D7C] uppercase tracking-wide">Loading interview setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F0F1F1]">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide
                      ? 'bg-[#4A6D7C]'
                      : index < currentSlide
                      ? 'bg-[#4A6D7C] opacity-50'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-normal text-black text-center uppercase tracking-wide">
            {slides[currentSlide].title}
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Step {currentSlide + 1} of {slides.length}
          </p>
        </div>

        {/* Slide Content */}
        <div className="bg-white p-8 shadow-lg rounded-lg">
          <CurrentSlideComponent
            setupData={setupData}
            updateSetupData={updateSetupData}
            jobs={jobs}
            jobsLoading={jobsLoading}
            onNext={nextSlide}
            onBack={handleBack}
            onComplete={createInterviewSession}
            isCreatingSession={isCreatingSession}
            isLastSlide={currentSlide === slides.length - 1}
            isFirstSlide={currentSlide === 0}
          />
        </div>
      </div>
    </div>
  )
}

export default function InterviewSetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InterviewSetupContent />
    </Suspense>
  )
}
