import { X } from 'lucide-react'
import { Input } from '~/components/ui/input'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  children?: React.ReactNode
}

export function FilterBar({ search, onSearchChange, children }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="pr-8"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
