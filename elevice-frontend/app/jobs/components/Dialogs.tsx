import type { JobDisplay, UpdateJobRequest } from "@/types/job"
import { CreateJobDialog } from "@/app/jobs/components/CreateJobDialog"
import { JobDetailsDialog } from "@/app/jobs/components/JobDetailsDialog"

interface DialogsProps {
  isCreateDialogOpen: boolean
  setIsCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleCreateJob: (jobData: { name: string; position?: string; description?: string }) => Promise<void>
  selectedJob: JobDisplay | null
  isDetailsDialogOpen: boolean
  setIsDetailsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  onJobDelete: (jobId: string) => Promise<void>
  onJobUpdate: (jobId: string, jobData: UpdateJobRequest) => Promise<void>
  onViewHistory?: (jobId: string) => void
}

export default function Dialogs({ 
  isCreateDialogOpen, 
  setIsCreateDialogOpen, 
  handleCreateJob, 
  selectedJob, 
  isDetailsDialogOpen, 
  setIsDetailsDialogOpen,
  onJobDelete,
  onJobUpdate,
}: DialogsProps) {
  return (
    <>
      <CreateJobDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onJobCreated={handleCreateJob}
      />
      {selectedJob && (
        <JobDetailsDialog 
          job={selectedJob}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          onJobDelete={onJobDelete}
          onJobUpdate={onJobUpdate}
        />
      )}
    </>
  )
}
