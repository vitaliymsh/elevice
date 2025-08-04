import type { InterviewType } from "@/types/interview"
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

export default function InterviewTypeSlide({
  setupData,
  updateSetupData,
  onNext,
  onBack,
}: SlideProps) {
  const interviewTypes = [
    {
      id: "behavioral" as InterviewType,
      title: "BEHAVIORAL",
      description: "Questions about past experiences, teamwork, and problem-solving scenarios",
      examples: ["Tell me about a time when...", "How do you handle conflict?", "Describe a challenging project"],
    },
    {
      id: "technical" as InterviewType,
      title: "TECHNICAL",
      description: "Role-specific technical questions and problem-solving challenges",
      examples: ["Coding problems", "System design", "Technical concepts and implementation"],
    },
    {
      id: "general" as InterviewType,
      title: "GENERAL",
      description: "Mix of behavioral and technical questions suitable for most positions",
      examples: ["Background questions", "Career goals", "Basic technical knowledge"],
    },
    {
      id: "case-study" as InterviewType,
      title: "CASE STUDY",
      description: "Business scenarios and analytical problem-solving exercises",
      examples: ["Business analysis", "Strategic thinking", "Data interpretation"],
    },
  ]

  const handleTypeSelection = (type: InterviewType) => {
    updateSetupData({ interviewType: type })
  }

  const handleNext = () => {
    // Skip custom job description if using existing job
    if (setupData.useExistingJob && setupData.selectedJob) {
      onNext()
    } else if (!setupData.useExistingJob) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-lg text-black mb-4">
          What type of interview would you like to practice?
        </p>
        <p className="text-gray-600"></p>      
      </div>

      <div className="grid gap-4">
        {interviewTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleTypeSelection(type.id)}
            className={`p-6 text-left border rounded-lg transition-colors ${
              setupData.interviewType === type.id
                ? 'border-[#4A6D7C] bg-[#4A6D7C] bg-opacity-10'
                : 'border-gray-200 hover:border-[#4A6D7C] hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-xl font-medium uppercase tracking-wide mb-2 ${ setupData.interviewType === type.id
                  ? 'text-white'
                  : 'text-black'
                }`}>
                  {type.title}
                </h3>
                <p className={` mb-3 ${ setupData.interviewType === type.id
                  ? 'text-gray-300'
                  : 'text-gray-600'
                }`}>
                  {type.description}
                </p>
                <div className={`text-sm ${ setupData.interviewType === type.id
                  ? 'text-gray-400'
                  : 'text-gray-5000'
                }`}>
                  <span className="font-medium">Examples: </span>
                  {type.examples.join(", ")}
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 ${
                setupData.interviewType === type.id
                  ? 'border-[#4A6D7C] bg-[#4A6D7C]'
                  : 'border-gray-300'
              }`}>
                {setupData.interviewType === type.id && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom Job Description for non-existing jobs */}
      {!setupData.useExistingJob && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-black uppercase tracking-wide mb-4">
            Custom Job Description (Optional)
          </h3>
          <textarea
            value={setupData.customJobDescription}
            onChange={(e) => updateSetupData({ customJobDescription: e.target.value })}
            placeholder="Describe the role, responsibilities, and requirements for the position you're interviewing for..."
            className="w-full p-4 border border-gray-300 rounded-lg text-black placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-[#4A6D7C] focus:border-[#4A6D7C]"
            rows={4}
          />
          <p className="text-sm text-gray-600 mt-2">
            Providing a job description will help tailor the interview questions to the specific role.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="bg-transparent text-[#4A6D7C] px-6 py-3 uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="bg-[#4A6D7C] text-white px-6 py-3 uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
