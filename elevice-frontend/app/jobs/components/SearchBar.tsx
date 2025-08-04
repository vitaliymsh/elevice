import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, X } from "lucide-react"

interface SearchBarProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  loading: boolean
}

export default function SearchBar({ searchQuery, onSearchQueryChange, loading }: SearchBarProps) {
  return (
    <div className="mb-8 max-w-md">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        )}
        <Input
          type="search"
          placeholder="Search by job title or position..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-10 pr-10 w-full"
          disabled={loading}
        />
        {searchQuery && !loading && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSearchQueryChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  )
}