import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"

interface HeaderProps {
  onBack?: () => void
  setIsCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Header({ onBack, setIsCreateDialogOpen }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            BACK
          </Button>
        )}
        <div>
          <h1 className="text-4xl md:text-6xl font-normal text-black mb-2 uppercase tracking-wide">
            JOB MANAGEMENT
          </h1>
          <p className="text-lg text-black uppercase tracking-wide">
            CREATE AND MANAGE JOB POSITIONS
          </p>
        </div>
      </div>
      <Button onClick={() => setIsCreateDialogOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        CREATE JOB
      </Button>
    </div>
  )
}