import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Calendar, Building, CheckCircle } from "lucide-react"
import type { JobListItem } from "@/types/job"

interface StatsProps {
  jobs: JobListItem[]
  totalJobs: number
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium uppercase">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function Stats({ jobs, totalJobs }: StatsProps) {
  const activeJobs = jobs.filter(j => j.isActive).length
  const uniquePositions = new Set(jobs.map(j => j.position)).size
  const thisMonth = jobs.filter(j => {
    const jobDate = new Date(j.createdAt)
    const now = new Date()
    return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard title="Total Jobs" value={totalJobs} icon={<Briefcase className="w-4 h-4 text-muted-foreground" />} />
      <StatCard title="Active Jobs" value={activeJobs} icon={<CheckCircle className="w-4 h-4 text-muted-foreground" />} />
      <StatCard title="Positions" value={uniquePositions} icon={<Building className="w-4 h-4 text-muted-foreground" />} />
      <StatCard title="This Month" value={thisMonth} icon={<Calendar className="w-4 h-4 text-muted-foreground" />} />
    </div>
  )
}