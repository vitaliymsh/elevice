"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Clock, MessageSquare, Play, Trash2, ArrowLeft, CheckCircle, CircleDotDashed } from "lucide-react"
import { useInterviewHistory } from "@/hooks/interview/useInterviewHistory"
import { useUserSession } from "@/hooks/useUserSession"
import { DatabaseService } from "@/services/database"
import FiltersCard from "./components/FiltersCard"
import type { EvaluationResponse } from "@/types/interview"
import { FilterStatus, SortBy } from "@/types"
import { formatDate, formatDuration, getInterviewTypeLabel, getStatusVariant } from "@/utils"

interface JobOption {
  id: string;
  title: string;
}

interface InterviewHistoryItem {
  interview_id: string;
  interview_type: string;
  created_at: string;
  last_updated_at: string;
  final_evaluation: EvaluationResponse | null;
  status: string;
  turns_count: number;
  job_id: string | null;
}

function InterviewHistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId } = useUserSession()

  const [jobs, setJobs] = useState<JobOption[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [jobFilter, setJobFilter] = useState('')
  const [deleteAlert, setDeleteAlert] = useState<{ isOpen: boolean; interviewId: string | null }>({ isOpen: false, interviewId: null })

  const {
    interviews,
    isLoading,
    error,
    refreshHistory,
    deleteInterview,
    getInterviewStats
  } = useInterviewHistory(userId)

  // Fetch simple job list for filter dropdown
  useEffect(() => {
    const fetchJobs = async () => {
      if (!userId) return

      setJobsLoading(true)
      try {
        const result = await DatabaseService.getJobs(userId)
        const jobOptions = result.map((job: any) => ({
          id: job.id,
          title: job.title
        }))
        setJobs(jobOptions)
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setJobsLoading(false)
      }
    }

    fetchJobs()
  }, [userId])

  // Update state when URL parameters change
  useEffect(() => {
    const urlStatus = searchParams.get('status') as FilterStatus || 'all'
    const urlSearch = searchParams.get('search') || ''
    const urlSort = searchParams.get('sort') as SortBy || 'newest'
    const urlJob = searchParams.get('jobId') || ''

    setSearchTerm(urlSearch)
    setStatusFilter(urlStatus)
    setSortBy(urlSort)
    setJobFilter(urlJob)
  }, [searchParams])  

  // Filter and sort interviews
  const filteredInterviews = interviews
    .filter(interview => {
      const matchesStatus = statusFilter === 'all' || interview.status === statusFilter
      const matchesSearch = !searchTerm ||
        interview.interview_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.interview_id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesJob = !jobFilter || interview.job_id === jobFilter

      return matchesStatus && matchesSearch && matchesJob
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'turns':
          return b.turns_count - a.turns_count
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const handleResumeInterview = (interviewId: string) => {
    router.push(`/interview-session/${interviewId}`)
  }

  const handleInterviewClick = (interview: InterviewHistoryItem) => {
    router.push(`/interview-session/${interview.interview_id}`)
  }

  const handleDeleteClick = (interviewId: string) => {
    setDeleteAlert({ isOpen: true, interviewId })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteAlert.interviewId) return
    try {
      await deleteInterview(deleteAlert.interviewId)
    } catch (error) {
      console.error('Failed to delete interview:', error)
      // Consider adding a toast notification here for better UX
    } finally {
      setDeleteAlert({ isOpen: false, interviewId: null })
    }
  }

  const stats = getInterviewStats()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/40 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
            <div>
              <Skeleton className="h-12 w-96 mb-3" />
              <Skeleton className="h-6 w-[500px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-48" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Interview History</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refreshHistory}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> BACK
              </Button>
              <div>
                <h1 className="text-4xl md:text-6xl font-normal text-black mb-2 uppercase tracking-wide">
                  INTERVIEW HISTORY
                  {jobFilter && jobs.length > 0 && (
                    <span className="block text-2xl md:text-3xl font-normal text-gray-600 mt-2">
                      {jobs.find((j: JobOption) => j.id === jobFilter)?.title}
                    </span>
                  )}
                </h1>
                <p className="text-lg text-black uppercase tracking-wide">
                  {jobFilter
                    ? `REVIEW INTERVIEW SESSIONS FOR THIS SPECIFIC JOB POSITION`
                    : `REVIEW YOUR PAST INTERVIEW SESSIONS AND CONTINUE WHERE YOU LEFT OFF`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium uppercase">TOTAL INTERVIEWS</CardTitle>
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium uppercase">COMPLETED</CardTitle>
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium uppercase">IN PROGRESS</CardTitle>
                <CircleDotDashed className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium uppercase">TOTAL TURNS</CardTitle>
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalTurns}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <FiltersCard
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            jobFilter={jobFilter}
            onJobFilterChange={setJobFilter}
            jobs={jobs}
            jobsLoading={jobsLoading}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Interview List */}
          {filteredInterviews.length === 0 ? (
            <Card className="text-center p-12 flex flex-col items-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-foreground mb-2">NO INTERVIEWS FOUND</h3>
              <p className="text-lg text-muted-foreground mb-8">
                {interviews.length === 0
                  ? "You haven't started any interviews yet."
                  : "No interviews match your current filters."
                }
              </p>
              <Button onClick={() => router.push('/interview-setup')}>
                START YOUR FIRST INTERVIEW
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredInterviews.map((interview) => (
                <Card
                  key={interview.interview_id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleInterviewClick(interview)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-start justify-start gap-2 w-full">
                      <div className="flex flex-row justify-between w-full">
                        <div className="flex items-center gap-4 mb-4">
                          <h3 className="text-xl font-semibold">{getInterviewTypeLabel(interview.interview_type)} Interview</h3>
                          <Badge variant={getStatusVariant(interview.status)} className="capitalize">
                            {interview.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex gap-3 ml-6">
                          {interview.status === 'in_progress' && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleResumeInterview(interview.interview_id); }}
                            >
                              <Play className="mr-2 h-4 w-4" /> Resume
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(interview.interview_id); }}
                          >
                            <Trash2 className="h-5 w-5" />
                            <span className="sr-only">Delete interview</span>
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-muted-foreground mb-6 text-sm">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4" />
                            <span>STARTED: {formatDate(interview.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4" />
                            <span>DURATION: {formatDuration(interview.created_at, interview.last_updated_at)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <MessageSquare className="w-4 h-4" />
                            <span>{interview.turns_count} EXCHANGES</span>
                          </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <AlertDialog open={deleteAlert.isOpen} onOpenChange={(open) => setDeleteAlert({ ...deleteAlert, isOpen: open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the interview history and all its associated data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
}

export default function InterviewHistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InterviewHistoryContent />
    </Suspense>
  )
}