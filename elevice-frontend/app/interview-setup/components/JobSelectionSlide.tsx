import { useState } from "react"
import type { JobDisplay } from "@/types/job"
import type { SetupData } from "@/types"

interface SlideProps {
  setupData: SetupData
  updateSetupData: (updates: Partial<SetupData>) => void
  jobs: JobDisplay[]
  jobsLoading: boolean
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  isCreatingSession: boolean
  isLastSlide: boolean
  isFirstSlide: boolean
}

export default function JobSelectionSlide({
  setupData,
  updateSetupData,
  jobs,
  jobsLoading,
  onNext,
  onBack,
}: SlideProps) {
  const [mode, setMode] = useState<'select' | 'manual'>('select')
  const [manualJobPosition, setManualJobPosition] = useState('')
  const [manualJobDescription, setManualJobDescription] = useState('')

  const handleJobSelection = (job: JobDisplay | null) => {
    updateSetupData({ selectedJob: job, useExistingJob: true })
  }

  const handleManualMode = () => {
    setMode('manual')
    updateSetupData({ selectedJob: null, useExistingJob: false })
  }

  const handleSelectMode = () => {
    setMode('select')
    updateSetupData({ useExistingJob: true })
  }

  const handleManualContinue = () => {
    if (manualJobPosition.trim()) {
      updateSetupData({ 
        customJobDescription: `Position: ${manualJobPosition.trim()}${manualJobDescription.trim() ? `\n\nDescription: ${manualJobDescription.trim()}` : ''}`,
        useExistingJob: false,
        selectedJob: null
      })
      onNext()
    }
  }

  const handleUseExisting = () => {
    if (setupData.selectedJob) {
      onNext()
    }
  }

  // If a job is already selected (from URL parameter), show confirmation
  if (setupData.selectedJob && setupData.useExistingJob && mode === 'select') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <p className="text-lg text-black mb-4 uppercase tracking-wide">
            JOB SELECTED FOR INTERVIEW PRACTICE
          </p>
          <p className="text-gray-600">
            You have selected the following job for your interview practice.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="p-6 border border-[#4A6D7C] bg-white rounded">
            <div className="font-normal text-black uppercase truncate tracking-wide text-lg mb-2">
              {setupData.selectedJob.title}
            </div>
            {setupData.selectedJob.position && (
              <div className="text-sm text-[#4A6D7C] mb-3 uppercase tracking-wide">
                {setupData.selectedJob.position.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </div>
            )}
            {setupData.selectedJob.description && (
              <div className="text-sm text-gray-700 line-clamp-4">
                {setupData.selectedJob.description}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => updateSetupData({ selectedJob: null })}
            className="bg-transparent text-[#4A6D7C] px-8 py-3 text-sm uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
          >
            CHOOSE DIFFERENT JOB
          </button>
          <button
            onClick={handleUseExisting}
            className="bg-[#4A6D7C] text-white px-8 py-3 text-sm uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200"
          >
            CONTINUE WITH THIS JOB
          </button>
        </div>
      </div>
    )
  }

  if (jobsLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-[#4A6D7C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#4A6D7C] uppercase tracking-wide">LOADING YOUR JOBS...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-lg text-black mb-4 uppercase tracking-wide">
          CHOOSE YOUR INTERVIEW APPROACH
        </p>
        <p className="text-gray-600">
          Select an existing job or create a custom interview with manual job details.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={handleSelectMode}
          className={`px-6 py-3 text-sm uppercase tracking-wide border transition-colors duration-200 ${
            mode === 'select'
              ? 'bg-[#4A6D7C] text-white border-[#4A6D7C]'
              : 'bg-white text-[#4A6D7C] border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white'
          }`}
        >
          SELECT EXISTING JOB
        </button>
        <button
          onClick={handleManualMode}
          className={`px-6 py-3 text-sm uppercase tracking-wide border transition-colors duration-200 ${
            mode === 'manual'
              ? 'bg-[#4A6D7C] text-white border-[#4A6D7C]'
              : 'bg-white text-[#4A6D7C] border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white'
          }`}
        >
          MANUAL JOB ENTRY
        </button>
      </div>

      {mode === 'select' ? (
        // Existing Jobs Selection
        jobs.length > 0 ? (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-normal text-black uppercase tracking-wide">
                SELECT FROM YOUR JOBS
              </h3>
              <div className="grid gap-3 max-h-64 overflow-y-auto">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleJobSelection(job)}
                    className={`p-4 text-left border transition-colors duration-200 ${
                      setupData.selectedJob?.id === job.id
                        ? 'border-[#4A6D7C] bg-[#4A6D7C] bg-opacity-10'
                        : 'border-gray-200 hover:border-[#4A6D7C] hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-normal text-black uppercase tracking-wide">
                      {job.title}
                    </div>
                    {job.position && (
                      <div className="text-sm text-[#4A6D7C] mt-1 uppercase tracking-wide">
                        {job.position.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </div>
                    )}
                    {job.description && (
                      <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {job.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons for Select Mode */}
            <div className="flex justify-between pt-6">
              <button
                onClick={onBack}
                className="bg-transparent text-[#4A6D7C] px-8 py-3 text-sm uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
              >
                BACK
              </button>
              <button
                onClick={handleUseExisting}
                disabled={!setupData.selectedJob}
                className={`px-8 py-3 text-sm uppercase tracking-wide transition-colors duration-200 ${
                  setupData.selectedJob
                    ? 'bg-[#4A6D7C] text-white hover:bg-[#3A5A6B]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                CONTINUE WITH SELECTED JOB
              </button>
            </div>
          </>
        ) : (
          // No Jobs Available
          <div className="text-center py-8">
            <p className="text-lg text-black mb-4 uppercase tracking-wide">
              NO JOBS FOUND
            </p>
            <p className="text-gray-600 mb-6">
              You don't have any jobs created yet. Switch to manual mode to create a custom interview.
            </p>
            <button
              onClick={handleManualMode}
              className="bg-[#4A6D7C] text-white px-8 py-3 text-sm uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200"
            >
              USE MANUAL JOB ENTRY
            </button>
          </div>
        )
      ) : (
        // Manual Job Entry Mode
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-normal text-black uppercase tracking-wide">
              ENTER JOB DETAILS MANUALLY
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-[#4A6D7C] mb-2 uppercase tracking-wide">
                JOB POSITION *
              </label>
              <input
                type="text"
                value={manualJobPosition}
                onChange={(e) => setManualJobPosition(e.target.value)}
                placeholder="e.g., Senior Software Engineer, Product Manager, Data Scientist"
                className="w-full p-3 border border-gray-300 focus:border-[#4A6D7C] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A6D7C] mb-2 uppercase tracking-wide">
                JOB DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                value={manualJobDescription}
                onChange={(e) => setManualJobDescription(e.target.value)}
                placeholder="Enter job responsibilities, requirements, or any specific details you'd like to focus on during the interview..."
                rows={6}
                className="w-full p-3 border border-gray-300 focus:border-[#4A6D7C] focus:outline-none transition-colors resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Adding a description will help tailor the interview questions to your specific role.
              </p>
            </div>
          </div>

          {/* Action Buttons for Manual Mode */}
          <div className="flex justify-between pt-6">
            <button
              onClick={onBack}
              className="bg-transparent text-[#4A6D7C] px-8 py-3 text-sm uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
            >
              BACK
            </button>
            <button
              onClick={handleManualContinue}
              disabled={!manualJobPosition.trim()}
              className={`px-8 py-3 text-sm uppercase tracking-wide transition-colors duration-200 ${
                manualJobPosition.trim()
                  ? 'bg-[#4A6D7C] text-white hover:bg-[#3A5A6B]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              CONTINUE WITH MANUAL JOB
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
