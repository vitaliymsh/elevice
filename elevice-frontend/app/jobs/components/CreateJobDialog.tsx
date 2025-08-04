"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { JobPosition, CreateJobRequest } from "@/types/job"
import { JOB_POSITIONS } from "@/utils/jobs"

interface CreateJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobCreated: (jobData: CreateJobRequest) => Promise<void>
}

export function CreateJobDialog({ open, onOpenChange, onJobCreated }: CreateJobDialogProps) {
  
  const [formData, setFormData] = useState<{ name: string; position: JobPosition; description: string }>({
    name: "",
    position: "software-engineer",
    description: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError("Job name is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Call the API through the parent component
      await onJobCreated({
        name: formData.name.trim(),
        position: formData.position,
        description: formData.description.trim() || undefined,
      })

      handleClose()
      
    } catch (error) {
      console.error("Error creating job:", error)
      setError("Failed to create job. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form on close
    setFormData({
      name: "",
      position: "software-engineer",
      description: "",
    })
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-3xl md:text-4xl font-normal text-black uppercase tracking-wide leading-none">
            CREATE NEW JOB
          </DialogTitle>
          <p className="text-lg text-black mt-4 uppercase tracking-wide">
            ADD A JOB POSITION FOR TARGETED INTERVIEW PRACTICE
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
              <p className="text-red-700 text-sm uppercase tracking-wide">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-black uppercase tracking-wide">Job Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="E.G., SENIOR REACT DEVELOPER"
                className="w-full px-4 py-3 text-sm uppercase tracking-wide border border-[#4A6D7C] bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A6D7C] focus:border-transparent"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm font-medium text-black uppercase tracking-wide">Position *</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position: value as JobPosition }))}
                required
              >
                <SelectTrigger className="w-full px-4 py-3 text-sm uppercase tracking-wide border border-[#4A6D7C] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#4A6D7C] focus:border-transparent">
                  <SelectValue placeholder="SELECT A POSITION" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#4A6D7C]">
                  {JOB_POSITIONS.map(pos => (
                    <SelectItem key={pos.value} value={pos.value} className="uppercase tracking-wide text-black hover:bg-gray-100">
                      {pos.label.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-black uppercase tracking-wide">Job Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="DESCRIBE THE ROLE, RESPONSIBILITIES, AND WHAT YOU'RE LOOKING FOR..."
                className="w-full px-4 py-3 text-sm border border-[#4A6D7C] bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A6D7C] focus:border-transparent min-h-[120px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-4 justify-center pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-transparent text-[#4A6D7C] px-8 py-3 text-lg uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
            >
              CANCEL
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-[#4A6D7C] text-white px-8 py-3 text-lg uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "CREATING..." : "CREATE JOB"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
