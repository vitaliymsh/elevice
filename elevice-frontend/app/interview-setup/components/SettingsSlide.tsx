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

export default function SettingsSlide({
  setupData,
  updateSetupData,
  onNext,
  onBack,
}: SlideProps) {
  const maxQuestionOptions = [
    { value: 3, label: "3 QUESTIONS", description: "Quick practice session (~10 minutes)" },
    { value: 5, label: "5 QUESTIONS", description: "Standard session (~15-20 minutes)" },
    { value: 10, label: "10 QUESTIONS", description: "Comprehensive session (~30-40 minutes)" },
    { value: null, label: "FREE FLOW", description: "Continue until you decide to end" },
  ]

  const handleMaxQuestionsChange = (value: number | null) => {
    updateSetupData({ maxQuestions: value })
  }

  // const handleAutoAnsweringChange = (value: boolean) => {
  //   updateSetupData({ isAutoAnswering: value })
  // }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-lg text-black mb-4">
          Configure your interview session settings
        </p>
        <p className="text-gray-600">
          These settings control the length and interaction style of your interview.
        </p>
      </div>

      {/* Interview Length */}
      <div>
        <h3 className="text-lg font-medium text-black uppercase tracking-wide mb-4">
          Interview Length
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {maxQuestionOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => handleMaxQuestionsChange(option.value)}
              className={`p-4 text-left border rounded-lg transition-colors ${
                setupData.maxQuestions === option.value
                  ? 'border-[#4A6D7C] bg-[#4A6D7C] bg-opacity-10'
                  : 'border-gray-200 hover:border-[#4A6D7C] hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium text-black uppercase tracking-wide mb-1 ${
                  setupData.maxQuestions === option.value
                    ? 'text-white'
                    : 'text-black'
                }`}>
                    {option.label}
                  </div>
                  <div className={`text-sm  ${
                  setupData.maxQuestions === option.value
                    ? 'text-gray-300'
                    : 'text-gray-600'
                }`}>
                    {option.description}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  setupData.maxQuestions === option.value
                    ? 'border-[#4A6D7C] bg-[#4A6D7C]'
                    : 'border-gray-300'
                }`}>
                  {setupData.maxQuestions === option.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Response Mode */}
      {/* <div>
        <h3 className="text-lg font-medium text-black uppercase tracking-wide mb-4">
          Response Mode
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => handleAutoAnsweringChange(true)}
            className={`w-full p-4 text-left border rounded-lg transition-colors ${
              setupData.isAutoAnswering
                ? 'border-[#4A6D7C] bg-[#4A6D7C] bg-opacity-10'
                : 'border-gray-200 hover:border-[#4A6D7C] hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-black uppercase tracking-wide mb-1">
                  VOICE RESPONSES
                </div>
                <div className="text-sm text-gray-600">
                  Speak your answers aloud for a realistic interview experience
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                setupData.isAutoAnswering
                  ? 'border-[#4A6D7C] bg-[#4A6D7C]'
                  : 'border-gray-300'
              }`}>
                {setupData.isAutoAnswering && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => handleAutoAnsweringChange(false)}
            className={`w-full p-4 text-left border rounded-lg transition-colors ${
              !setupData.isAutoAnswering
                ? 'border-[#4A6D7C] bg-[#4A6D7C] bg-opacity-10'
                : 'border-gray-200 hover:border-[#4A6D7C] hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-black uppercase tracking-wide mb-1">
                  TEXT RESPONSES
                </div>
                <div className="text-sm text-gray-600">
                  Type your answers for a more controlled practice environment
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                !setupData.isAutoAnswering
                  ? 'border-[#4A6D7C] bg-[#4A6D7C]'
                  : 'border-gray-300'
              }`}>
                {!setupData.isAutoAnswering && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </button>
        </div>
      </div> */}

      {/* Settings Summary */}
      <div className="p-4 bg-[#F0F1F1] rounded-lg">
        <div className="text-center">
          <h4 className="text-sm text-gray-600 uppercase tracking-wide mb-2">
            Session Configuration
          </h4>
          <div className="flex items-center justify-center gap-2"></div>
            <div>
              <span className="font-medium text-gray-600">Length: {setupData.maxQuestions === null 
                  ? "Free Flow" 
                  : `${setupData.maxQuestions} Questions`
                }</span>

            </div>
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
          Review & Start
        </button>
      </div>
    </div>
  )
}
