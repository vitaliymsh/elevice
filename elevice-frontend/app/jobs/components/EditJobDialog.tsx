"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { JobDisplay, JobPosition, UpdateJobRequest } from "@/types/job"
import { JOB_POSITIONS } from "@/utils/jobs"

interface EditJobDialogProps {
  job: JobDisplay | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobUpdated: (jobData: UpdateJobRequest) => Promise<void>
}

export function EditJobDialog({ job, open, onOpenChange, onJobUpdated }: EditJobDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    position: "software-engineer" as JobPosition,
    description: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        name: job.title,
        position: job.position,
        description: job.description || ""
      })
    }
  }, [job])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = "Job title is required"
    }
    
    if (!formData.position) {
      newErrors.position = "Position is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await onJobUpdated({
        name: formData.name.trim(),
        position: formData.position,
        description: formData.description.trim() || undefined
      })
      
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        position: "software-engineer",
        description: ""
      })
      setErrors({})
    } catch (error) {
      console.error("Failed to update job:", error)
      setErrors({ submit: "Failed to update job. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setErrors({})
    // Reset form to original values
    if (job) {
      setFormData({
        name: job.title,
        position: job.position,
        description: job.description || ""
      })
    }
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl uppercase tracking-wide">EDIT JOB</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-job-title" className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              JOB TITLE *
            </Label>
            <Input
              id="edit-job-title"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter job title..."
              className={`uppercase tracking-wide ${errors.name ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-job-position" className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              POSITION *
            </Label>
            <Select 
              value={formData.position} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, position: value as JobPosition }))}
              disabled={isSubmitting}
            >
              <SelectTrigger className={`uppercase tracking-wide ${errors.position ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="SELECT A POSITION" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-300">
                {JOB_POSITIONS.map((position) => (
                  <SelectItem key={position.value} value={position.value} className="uppercase tracking-wide">
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.position && (
              <p className="text-red-500 text-sm">{errors.position}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-job-description" className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              DESCRIPTION
            </Label>
            <Textarea
              id="edit-job-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter job description (optional)..."
              rows={4}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>

          {errors.submit && (
            <p className="text-red-500 text-sm">{errors.submit}</p>
          )}

          <DialogFooter className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
              className="uppercase tracking-wide"
            >
              CANCEL
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#4A6D7C] hover:bg-[#3A5A6B] text-white uppercase tracking-wide"
            >
              {isSubmitting ? "UPDATING..." : "UPDATE JOB"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
