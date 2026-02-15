import { Badge } from '~/components/ui/badge'
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'

interface PathCardProps {
  path: ResolvedPath
  currentPoiId: string
}

export function PathCard({ path, currentPoiId }: PathCardProps) {
  const isFrom = path.fromPoiId === currentPoiId
  const destinationName = isFrom ? path.toName : path.fromName

  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <div className="flex-1 text-sm">
        <span className="font-medium">{path.name || path.type}</span>
        <span className="text-muted-foreground"> &rarr; {destinationName}</span>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">{path.type}</Badge>
      {path.baseTravelWatches > 0 && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {path.baseTravelWatches} watch{path.baseTravelWatches !== 1 ? 'es' : ''}
        </span>
      )}
    </div>
  )
}
