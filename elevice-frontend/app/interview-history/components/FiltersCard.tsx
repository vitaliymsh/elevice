"use client"

import { Filter, Search } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FilterStatus, JobOption, SortBy } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"


interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
}

function SearchFilter({ searchTerm, onSearchChange }: SearchFilterProps) {
  return (
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search interviews..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
}

interface StatusFilterProps {
  statusFilter: FilterStatus
  onStatusFilterChange: (value: FilterStatus) => void
}

function StatusFilter({ statusFilter, onStatusFilterChange }: StatusFilterProps) {
  return (
    <div className="w-full md:w-48">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="abandoned">Abandoned</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

interface SortFilterProps {
  sortBy: SortBy
  onSortChange: (value: SortBy) => void
}

function SortFilter({ sortBy, onSortChange }: SortFilterProps) {
  return (
    <div className="w-full md:w-48">
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="turns">Most Active</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

interface JobFilterProps {
  jobFilter: string
  onJobFilterChange: (value: string) => void
  jobs: JobOption[]
  loading: boolean
}

function JobFilter({ jobFilter, onJobFilterChange, jobs, loading }: JobFilterProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 w-full py-2 px-2 bg-white rounded-lg shadow-md">
        <Skeleton className="h-10 w-24 rounded-md" />
        <div className="flex-1 flex gap-2">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      </div>
    )
  }

  // Main style: white card, rounded corners, shadow, consistent spacing, mobile scroll
  return (
    <div className="w-full py-2 px-2  rounded">
      <ScrollArea className="w-full whitespace-nowrap">
        <ToggleGroup
          type="single"
          variant="outline"
          value={jobFilter}
          onValueChange={onJobFilterChange}
          className="flex items-center gap-3 py-2 overflow-x-auto"
        >
          <ToggleGroupItem
            value=""
            aria-label="Toggle All Jobs"
            className={`min-w-[120px] max-w-[180px] truncate px-4 py-2 text-base font-semibold border transition-colors duration-150 text-left overflow-hidden ${
              jobFilter === "" ? "bg-[#4A6D7C] text-white border-[#4A6D7C]" : "bg-[#F0F1F1] text-[#4A6D7C] hover:bg-[#e3e7ea] border-[#d1d5db]"
            }`}
          >
            <span className="block truncate">All Jobs</span>
          </ToggleGroupItem>
          {jobs.map((job) => (
            <ToggleGroupItem
              key={job.id}
              value={job.id}
              aria-label={`Toggle ${job.title}`}
              className={`min-w-[160px] max-w-[240px] truncate px-4 py-2 text-base font-semibold  border transition-colors duration-150 text-left overflow-hidden ${
                jobFilter === job.id ? "bg-[#4A6D7C] text-white border-[#4A6D7C]" : "bg-[#F0F1F1] text-[#4A6D7C] hover:bg-[#e3e7ea] border-[#d1d5db]"
              }`}
              title={job.title}
            >
              <span className="block truncate">{job.title}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}



interface FiltersCardProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  jobFilter: string
  onJobFilterChange: (value: string) => void
  jobs: JobOption[]
  jobsLoading: boolean
  statusFilter: FilterStatus
  onStatusFilterChange: (value: FilterStatus) => void
  sortBy: SortBy
  onSortChange: (value: SortBy) => void
}

export default function FiltersCard({
  searchTerm,
  onSearchChange,
  jobFilter,
  onJobFilterChange,
  jobs,
  jobsLoading,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange
}: FiltersCardProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <SearchFilter 
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
          />
          
          <StatusFilter
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
          />
          
          <SortFilter
            sortBy={sortBy}
            onSortChange={onSortChange}
          />
        </div>
        <JobFilter
          jobFilter={jobFilter}
          onJobFilterChange={onJobFilterChange}
          jobs={jobs}
          loading={jobsLoading}
        />
      </CardContent>
    </Card>
  )
}
