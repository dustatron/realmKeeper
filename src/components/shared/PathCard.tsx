import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { OPPOSITE_DIRECTION } from '@shared/constants'
import type { Direction } from '@shared/constants'
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'

interface PathCardProps {
  path: ResolvedPath
  currentPoiId: string
}

export function PathCard({ path, currentPoiId }: PathCardProps) {
  const isFrom = path.fromPoiId === currentPoiId
  const destinationId = isFrom ? path.toPoiId : path.fromPoiId
  const destinationName = isFrom ? path.toName : path.fromName

  // Show reverse direction when viewing from destination
  const displayDirection: Direction | null = path.direction
    ? (isFrom ? path.direction : OPPOSITE_DIRECTION[path.direction])
    : null

  return (
    <Link
      to="/realms/pois/$poiId"
      params={{ poiId: destinationId }}
      className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors"
    >
      {displayDirection && (
        <Badge variant="secondary" className="text-xs shrink-0 font-mono">
          {displayDirection.toUpperCase()}
        </Badge>
      )}
      <div className="flex-1 text-sm">
        <span className="font-medium">{path.name || path.type}</span>
        <span className="text-muted-foreground"> &rarr; {destinationName}</span>
      </div>
      {path.hasDoor && (
        <span className="text-sm shrink-0" title={path.isLocked ? 'Locked door' : 'Door'}>
          {path.isLocked ? '🔒' : '🚪'}
        </span>
      )}
      <Badge variant="outline" className="text-xs shrink-0">{path.type}</Badge>
      {path.baseTravelWatches > 0 && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {path.baseTravelWatches} watch{path.baseTravelWatches !== 1 ? 'es' : ''}
        </span>
      )}
    </Link>
  )
}
