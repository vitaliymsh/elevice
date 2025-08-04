"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Edit, Trash2 } from "lucide-react"
import type { JobDisplay, UpdateJobRequest } from "@/types/job"
import { EditJobDialog } from "./EditJobDialog"

interface JobDetailsDialogProps {
  job: JobDisplay
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobDelete: (jobId: string) => Promise<void>
  onJobUpdate: (jobId: string, jobData: UpdateJobRequest) => Promise<void>
}

export function JobDetailsDialog({ job, open, onOpenChange, onJobDelete, onJobUpdate }: JobDetailsDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Helper function to format position string
  const getPositionLabel = (position: string) => position.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  // Helper function to format date string
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Handler for starting an interview practice
  const handleStartInterview = () => {
    onOpenChange(false)
    router.push(`/interview-setup?jobId=${job.id}`)
  }

  const handleViewHistory = (jobId: string) => {
    router.push(`interview-history?jobId=${jobId}`)
  }

  // Handler for deleting a job
  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await onJobDelete(job.id)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for updating a job
  const handleJobUpdate = async (jobData: UpdateJobRequest) => {
    await onJobUpdate(job.id, jobData)
    setShowEditDialog(false)
  }

  return (
    <>
      <Dialog open={open && !showEditDialog} onOpenChange={onOpenChange}>
        {/*
          The DialogContent now uses a flexible height approach.
          - max-h-[90vh] ensures the dialog doesn't exceed 90% of the viewport height.
          - The flex flex-col class makes it a flex container, allowing its children to be structured vertically.
        */}
        <DialogContent className="flex flex-col max-w-4xl max-h-[90vh] p-6">
          <DialogHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                {/* The title now uses responsive font sizing. 
                  It's text-2xl on mobile and scales up to text-3xl on small screens and up.
                */}
                <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight mb-2">{job.title}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="text-sm px-3 py-1">{getPositionLabel(job.position)}</Badge>
                  {!job.isActive && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-3">
                <Button variant="outline" className="px-4 py-2" onClick={() => setShowEditDialog(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="px-4 py-2">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the "<span className="font-semibold">{job.title}</span>" job. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
                        {isSubmitting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" />Created: <span className="font-medium text-foreground">{formatDate(job.createdAt)}</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" />Updated: <span className="font-medium text-foreground">{formatDate(job.updatedAt)}</span></div>
            </div>

            {job.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Job Description</h3>
                <div className="max-h-40 overflow-y-auto p-2 bg-secondary rounded-md">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>
              </div>
            )}
            
          </div>
          
          <DialogFooter className="pt-4 border-t border-border mt-auto">
              <div className="flex flex-col sm:flex-row justify-end gap-3 w-full flex-wrap">
                  <Button onClick={handleStartInterview} className="px-5 py-2">Start Interview Practice</Button>
                  <Button variant="outline" className="px-5 py-2" onClick={() => handleViewHistory(job.id)}>View Interview History</Button>
              </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditJobDialog
        job={job}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onJobUpdated={handleJobUpdate}
      />
    </>
  )
}
