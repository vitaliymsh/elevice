import { SetupData } from "@/types"
import type { InterviewerPersona } from "@/types/interview"

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

export default function InterviewerStyleSlide({
  setupData,
  updateSetupData,
  onNext,
  onBack,
}: SlideProps) {
  const interviewerPersonas = [
    {
      id: "friendly" as InterviewerPersona,
      title: "FRIENDLY",
      description: "Warm and encouraging, puts you at ease",
      icon: "😊",
      style: "Creates a comfortable atmosphere with supportive feedback",
    },
    {
      id: "formal" as InterviewerPersona,
      title: "FORMAL",
      description: "Professional and structured approach",
      icon: "👔",
      style: "Maintains professional tone with clear, direct communication",
    },
    {
      id: "challenging" as InterviewerPersona,
      title: "CHALLENGING",
      description: "Pushes for detailed answers and follow-ups",
      icon: "🎯",
      style: "Asks probing questions to test depth of knowledge",
    },
    {
      id: "supportive" as InterviewerPersona,
      title: "SUPPORTIVE",
      description: "Helpful with hints and guidance",
      icon: "🤝",
      style: "Provides hints and helps you work through problems",
    },
    {
      id: "analytical" as InterviewerPersona,
      title: "ANALYTICAL",
      description: "Focuses on logic and problem-solving",
      icon: "🧠",
      style: "Emphasizes logical thinking and systematic approaches",
    },
    {
      id: "conversational" as InterviewerPersona,
      title: "CONVERSATIONAL",
      description: "Casual and discussion-oriented",
      icon: "💬",
      style: "Natural dialogue with open-ended discussions",
    },
  ]

  const handlePersonaSelection = (persona: InterviewerPersona) => {
    updateSetupData({ interviewerPersona: persona })
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-lg text-black mb-4">
          Choose your interviewer's personality style
        </p>
        <p className="text-gray-600">
          Different styles can help you practice for various interview scenarios and company cultures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {interviewerPersonas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => handlePersonaSelection(persona.id)}
            className={`p-4 text-left border rounded-lg transition-colors ${
              setupData.interviewerPersona === persona.id
                ? 'border-[#4A6D7C] bg-[#4A6D7C] bg-opacity-10'
                : 'border-gray-200 hover:border-[#4A6D7C] hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl mt-1">{persona.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-lg font-medium uppercase tracking-wide ${
                    setupData.interviewerPersona === persona.id
                      ? 'text-white'
                      : 'text-black'
                  }`}>
                    {persona.title}
                  </h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    setupData.interviewerPersona === persona.id
                      ? 'border-[#4A6D7C] bg-[#4A6D7C]'
                      : 'border-gray-300'
                  }`}>
                    {setupData.interviewerPersona === persona.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
                <p className={`text-sm mb-2 ${
                  setupData.interviewerPersona === persona.id
                    ? 'text-gray-300'
                    : 'text-gray-600'
                }`}>
                  {persona.description}
                </p>
                <p className={`text-xs ${
                  setupData.interviewerPersona === persona.id
                    ? 'text-gray-400'
                    : 'text-gray-500'
                }`}>
                  {persona.style}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-8 p-4 bg-[#F0F1F1] rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">
            Selected Interviewer Style
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">
              {interviewerPersonas.find(p => p.id === setupData.interviewerPersona)?.icon}
            </span>
            <p className="text-lg font-medium text-[#4A6D7C] uppercase tracking-wide">
              {interviewerPersonas.find(p => p.id === setupData.interviewerPersona)?.title}
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {interviewerPersonas.find(p => p.id === setupData.interviewerPersona)?.description}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="bg-transparent text-[#4A6D7C] px-6 py-3 uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="bg-[#4A6D7C] text-white px-6 py-3 uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
