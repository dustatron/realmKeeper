import { Badge } from '~/components/ui/badge'
import { FactionChip } from '~/components/shared/FactionChip'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'

interface AtAGlancePanelProps {
  mood?: string
  trouble?: string
  factionPresences: FactionPresence[]
  npcCount: number
  activeEvents: number
  paths: ResolvedPath[]
  currentPoiId: string
}

export function AtAGlancePanel({
  mood,
  trouble,
  factionPresences,
  npcCount,
  activeEvents,
  paths,
  currentPoiId,
}: AtAGlancePanelProps) {
  const hasAnything = mood || trouble || factionPresences.length > 0 || npcCount > 0 || activeEvents > 0 || paths.length > 0
  if (!hasAnything) return null

  const summaryParts: string[] = []
  if (npcCount > 0) summaryParts.push(`${npcCount} NPC${npcCount !== 1 ? 's' : ''}`)
  if (activeEvents > 0) summaryParts.push(`${activeEvents} active event${activeEvents !== 1 ? 's' : ''}`)
  if (paths.length > 0) summaryParts.push(`${paths.length} connection${paths.length !== 1 ? 's' : ''}`)

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      {/* Mood + Trouble */}
      {(mood || trouble) && (
        <div className="flex items-center gap-2 flex-wrap">
          {mood && <Badge variant="secondary" className="text-xs">{mood}</Badge>}
          {trouble && <span className="text-xs text-amber-600">{trouble}</span>}
        </div>
      )}

      {/* Faction chips */}
      {factionPresences.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {factionPresences.map((fp) => (
            <FactionChip key={fp.id} presence={fp} />
          ))}
        </div>
      )}

      {/* Summary line */}
      {summaryParts.length > 0 && (
        <p className="text-xs text-muted-foreground">{summaryParts.join(' \u00B7 ')}</p>
      )}

      {/* Paths inline */}
      {paths.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {paths.map((path) => {
            const isFrom = path.fromPoiId === currentPoiId
            const dest = isFrom ? path.toName : path.fromName
            return (
              <span key={path.id} className="text-xs text-muted-foreground">
                {path.name || path.type} &rarr; {dest}
                {path.baseTravelWatches > 0 && (
                  <span className="tabular-nums ml-1">({path.baseTravelWatches}w)</span>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
