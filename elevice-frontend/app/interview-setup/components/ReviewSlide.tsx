import type { SetupData } from "@/types"

interface SlideProps {
  setupData: SetupData
  updateSetupData: (updates: Partial<SetupData>) => void
  jobs: any[]
  jobsLoading: boolean
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  isCreatingSession: boolean
  isLastSlide: boolean
  isFirstSlide: boolean
}

export default function ReviewSlide({
  setupData,
  onBack,
  onComplete,
  isCreatingSession,
}: SlideProps) {
  const getInterviewTypeDisplay = (type: string) => {
    const types = {
      behavioral: "Behavioral",
      technical: "Technical", 
      general: "General",
      "case-study": "Case Study"
    }
    return types[type as keyof typeof types] || type
  }

  const getExpertiseLevelDisplay = (level: string) => {
    const levels = {
      uneducated: "Entry Level",
      foundational: "Foundational",
      competent: "Competent", 
      proficient: "Proficient",
      strategic: "Strategic"
    }
    return levels[level as keyof typeof levels] || level
  }

  const getPersonaDisplay = (persona: string) => {
    const personas = {
      friendly: "Friendly",
      formal: "Formal",
      challenging: "Challenging",
      supportive: "Supportive", 
      analytical: "Analytical",
      conversational: "Conversational"
    }
    return personas[persona as keyof typeof personas] || persona
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-lg text-black mb-4">
          Review your interview configuration
        </p>
        <p className="text-gray-600">
          Make sure everything looks correct before starting your interview session.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-6">
        {/* Job Information */}
        <div className="p-6 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-black uppercase tracking-wide mb-4">
            Position & Context
          </h3>
          <div className="space-y-3">
            {setupData.useExistingJob && setupData.selectedJob ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Job Position:</span>
                  <span className="font-medium text-black">{setupData.selectedJob.title}</span>
                </div>
                {setupData.selectedJob.position && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role Type:</span>
                    <span className="font-medium text-black">
                      {setupData.selectedJob.position.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </div>
                )}
                {setupData.selectedJob.description && (
                  <div className="mt-3">
                    <span className="text-gray-600 block mb-1">Job Description:</span>
                    <div className="text-sm text-black font-medium p-1 line-clamp-2">
                      {setupData.selectedJob.description}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Job Type:</span>
                  <span className="font-medium text-black">General Interview</span>
                </div>
                {setupData.customJobDescription && (
                  <div className="mt-3">
                    <span className="text-gray-600 block mb-2">Custom Description:</span>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {setupData.customJobDescription}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Interview Configuration */}
        <div className="p-6 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-black uppercase tracking-wide mb-4">
            Interview Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium text-black">{getInterviewTypeDisplay(setupData.interviewType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Skill Level:</span>
                <span className="font-medium text-black">{getExpertiseLevelDisplay(setupData.expertiseLevel)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Interviewer Style:</span>
                <span className="font-medium text-black">{getPersonaDisplay(setupData.interviewerPersona)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Questions:</span>
                <span className="font-medium text-black">
                  {setupData.maxQuestions === null ? "Free Flow" : `${setupData.maxQuestions} Questions`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Settings */}
        <div className="p-6 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-black uppercase tracking-wide mb-4">
            Session Settings
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Response Mode:</span>
              <span className="font-medium text-black">
                {setupData.isAutoAnswering ? "Voice Responses" : "Text Responses"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Duration:</span>
              <span className="font-medium text-black">
                {setupData.maxQuestions === null 
                  ? "Variable"
                  : setupData.maxQuestions === 3 
                  ? "~10 minutes"
                  : setupData.maxQuestions === 5
                  ? "~15-20 minutes"
                  : "~30-40 minutes"
                }
              </span>
            </div>
          </div>
        </div>

        {/* Session Preview */}
        <div className="p-4  bg-[#4A6D7C] bg-opacity-10 rounded-lg border border-[#4A6D7C]">
          <h4 className="font-medium text-white uppercase tracking-wide mb-2">
            Ready to Start
          </h4>
          <p className="text-sm text-gray-200">
            Your {getInterviewTypeDisplay(setupData.interviewType).toLowerCase()} interview session 
            {setupData.selectedJob ? ` for ${setupData.selectedJob.title}` : ""} is configured and ready to begin. 
            You'll be practicing at the {getExpertiseLevelDisplay(setupData.expertiseLevel).toLowerCase()} level 
            with a {getPersonaDisplay(setupData.interviewerPersona).toLowerCase()} interviewer.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          disabled={isCreatingSession}
          className={`px-6 py-3 uppercase tracking-wide border transition-colors duration-200 ${
            isCreatingSession
              ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
              : 'bg-transparent text-[#4A6D7C] border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white'
          }`}
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={isCreatingSession}
          className={`px-8 py-3 uppercase tracking-wide transition-colors duration-200 flex items-center gap-2 ${
            isCreatingSession
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-[#4A6D7C] text-white hover:bg-[#3A5A6B]'
          }`}
        >
          {isCreatingSession ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Session...
            </>
          ) : (
            "Start Interview"
          )}
        </button>
      </div>
    </div>
  )
}
