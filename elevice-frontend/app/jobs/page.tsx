"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"
import type { JobDisplay, JobListItem, UpdateJobRequest } from "@/types/job"
import { useJobs } from "@/hooks/useJobs"
import { useUserSession } from "@/hooks/useUserSession"

// Import components from the same directory
import Header from "./components/Header"
import SearchBar from "./components/SearchBar"
import Stats from "./components/Stats"
import JobsList from "./components/JobsList"
import Dialogs from "./components/Dialogs"

export default function JobsPage() {
  const router = useRouter()
  const { userId } = useUserSession()
  const {
    jobs,
    loading,
    error,
    totalJobs,
    searchQuery,
    setSearchQuery,
    createJob,
    updateJob,
    deleteJob,
    getJobById,
    refreshJobs,
    searchJobs,
    clearError,
  } = useJobs(userId)
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobDisplay | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Handle navigation
  const handleBack = () => {
    router.push('/')
  }

  // Handle search with debouncing
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      searchJobs(query)
    }, 300)
    
    setSearchTimeout(timeout)
  }

  // Convert JobDisplay to JobListItem for display
  const jobListItems: JobListItem[] = jobs.map(job => ({
    id: job.id,
    title: job.title,
    position: job.position,
    createdAt: job.createdAt,
    isActive: job.isActive
  }))

  const handleCreateJob = async (jobData: { name: string; position?: string; description?: string }) => {
    const newJob = await createJob(jobData)
    if (newJob) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleJobClick = async (jobId: string) => {
    const job = await getJobById(jobId)
    if (job) {
      setSelectedJob(job)
      setIsDetailsDialogOpen(true)
    }
  }

  const handleJobUpdate = async (jobId: string, jobData: UpdateJobRequest): Promise<void> => {
    const updatedJob = await updateJob(jobId, jobData)
    if (updatedJob) {
      // Update the selected job if it's the one being edited
      if (selectedJob?.id === jobId) {
        setSelectedJob(updatedJob)
      }
    }
  }

  const handleJobDelete = async (jobId: string) => {
    const success = await deleteJob(jobId)
    if (success && selectedJob?.id === jobId) {
      setIsDetailsDialogOpen(false)
      setSelectedJob(null)
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen bg-[#F0F1F1] p-6">
        <div className="max-w-7xl mx-auto">
          <Header onBack={handleBack} setIsCreateDialogOpen={setIsCreateDialogOpen} />
          
          {/* Loading Screen */}
          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#4A6D7C] mx-auto mb-4 animate-spin" />
                <div className="text-xl text-[#4A6D7C] uppercase tracking-wide">LOADING JOBS...</div>
              </div>
            </div>
          ) : (
            <>
              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              
              <SearchBar 
                searchQuery={searchQuery} 
                onSearchQueryChange={handleSearch}
                loading={loading}
              />
              <Stats jobs={jobListItems} totalJobs={totalJobs} />
              <JobsList 
                jobs={jobListItems} 
                handleJobClick={handleJobClick} 
                setIsCreateDialogOpen={setIsCreateDialogOpen} 
                searchQuery={searchQuery}
                loading={loading}
              />
            </>
          )}
        </div>
        <Dialogs 
          isCreateDialogOpen={isCreateDialogOpen} 
          setIsCreateDialogOpen={setIsCreateDialogOpen} 
          handleCreateJob={handleCreateJob} 
          selectedJob={selectedJob} 
          isDetailsDialogOpen={isDetailsDialogOpen} 
          setIsDetailsDialogOpen={setIsDetailsDialogOpen}
          onJobDelete={handleJobDelete}
          onJobUpdate={handleJobUpdate}
        />
      </div>
    </Suspense>
  )
}
