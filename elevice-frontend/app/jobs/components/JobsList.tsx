import { Loader2, Briefcase, Plus, Calendar } from "lucide-react"
import type { JobListItem } from "@/types/job"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface JobsListProps {
  jobs: JobListItem[]
  handleJobClick: (jobId: string) => Promise<void>
  setIsCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  loading: boolean
}

interface NoJobsFoundProps {
  searchQuery: string
  setIsCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
}

interface JobCardProps {
  job: JobListItem
  handleJobClick: (jobId: string) => Promise<void>
}

function getPositionLabel(position: string): string {
  return position.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function NoJobsFound({ searchQuery, setIsCreateDialogOpen }: NoJobsFoundProps) {
  return (
    <div className="bg-white border border-[#4A6D7C] p-8 text-center">
      <Briefcase className="w-12 h-12 text-[#4A6D7C] mx-auto mb-4" />
      <h3 className="text-lg font-normal text-black mb-2 uppercase tracking-wide">NO JOBS FOUND</h3>
      <p className="text-[#4A6D7C] mb-4 uppercase tracking-wide text-sm">
        {searchQuery ? "TRY ADJUSTING YOUR SEARCH TERMS" : "GET STARTED BY CREATING YOUR FIRST JOB POSITION"}
      </p>
      {!searchQuery && (
        <button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-transparent text-[#4A6D7C] px-8 py-3 text-sm uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <Plus className="w-4 h-4" />
          CREATE YOUR FIRST JOB
        </button>
      )}
    </div>
  )
}

function JobCard({ job, handleJobClick }: JobCardProps) {
  return (
    <Card 
      className="bg-white border border-[#4A6D7C] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
      onClick={() => handleJobClick(job.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-normal text-black uppercase tracking-wide">{job.title}</h3>
              {!job.isActive && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <p className="text-[#4A6D7C] font-medium mb-2 uppercase tracking-wide text-sm">
              {getPositionLabel(job.position)}
            </p>
            <div className="flex items-center gap-4 text-sm text-black uppercase tracking-wide">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>CREATED {formatDate(job.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



export default function JobsList({ jobs, handleJobClick, setIsCreateDialogOpen, searchQuery, loading }: JobsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-[#4A6D7C]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm uppercase tracking-wide">Loading jobs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.length === 0 ? (
        <NoJobsFound searchQuery={searchQuery} setIsCreateDialogOpen={setIsCreateDialogOpen} />
      ) : (
        jobs.map((job) => (
          <JobCard key={job.id} job={job} handleJobClick={handleJobClick} />
        ))
      )}
    </div>
  )
}
