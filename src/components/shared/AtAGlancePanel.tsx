import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { FactionChip } from '~/components/shared/FactionChip'
import { OPPOSITE_DIRECTION } from '@shared/constants'
import type { Direction } from '@shared/constants'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'
import { formatDistance } from '~/lib/hexmap/travel'

interface AtAGlancePanelProps {
  mood?: string
  trouble?: string
  factionPresences: FactionPresence[]
  npcCount: number
  activeEvents: number
  paths: ResolvedPath[]
  currentPoiId: string
  traps?: Trap[]
  treasure?: TreasureItem[]
  onToggleTrapDisarmed?: (trapId: string) => void
  roomWidth?: number | null
  roomLength?: number | null
  lightLevel?: string | null
}

export function AtAGlancePanel({
  mood,
  trouble,
  factionPresences,
  npcCount,
  activeEvents,
  paths,
  currentPoiId,
  traps,
  treasure,
  onToggleTrapDisarmed,
  roomWidth,
  roomLength,
  lightLevel,
}: AtAGlancePanelProps) {
  const trapCount = traps?.length ?? 0
  const armedTraps = traps?.filter((t) => !t.disarmed).length ?? 0
  const treasureCount = treasure?.length ?? 0
  const uncollectedTreasure = treasure?.filter((t) => !t.collected).length ?? 0
  const magicItems = treasure?.filter((t) => t.isMagic) ?? []
  const hasDimensions = roomWidth != null && roomLength != null
  const hasAnything = mood || trouble || factionPresences.length > 0 || npcCount > 0 || activeEvents > 0 || paths.length > 0 || trapCount > 0 || treasureCount > 0 || hasDimensions || lightLevel
  if (!hasAnything) return null

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3 overflow-hidden">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">At a Glance</p>
      {/* Top line: dimensions + light + mood + trouble */}
      {(hasDimensions || mood || trouble || lightLevel) && (
        <div className="space-y-1.5">
          {/* Short badges on one line */}
          {(hasDimensions || lightLevel) && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasDimensions && (
                <Badge variant="outline" className="text-xs font-mono">📐 {roomWidth}×{roomLength} ft</Badge>
              )}
              {lightLevel && (
                <Badge variant="secondary" className="text-xs">
                  {lightLevel === 'bright' ? '☀️' : lightLevel === 'dim' ? '🌓' : '🌑'}{' '}
                  {lightLevel.charAt(0).toUpperCase() + lightLevel.slice(1)}
                </Badge>
              )}
            </div>
          )}
          {/* Mood + trouble as wrapping text blocks */}
          {mood && (
            <p className="text-xs rounded-md bg-secondary/50 px-2 py-1">
              <span className="font-medium">Mood:</span> {mood}
            </p>
          )}
          {trouble && (
            <p className="text-xs rounded-md bg-destructive/15 text-destructive px-2 py-1">
              ⚠️ {trouble}
            </p>
          )}
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

      {/* Quick stats line */}
      {(npcCount > 0 || activeEvents > 0 || treasureCount > 0) && (
        <p className="text-xs text-muted-foreground">
          {[
            npcCount > 0 && `👤 ${npcCount} NPC${npcCount !== 1 ? 's' : ''}`,
            activeEvents > 0 && `📅 ${activeEvents} event${activeEvents !== 1 ? 's' : ''}`,
            treasureCount > 0 && `💰 ${uncollectedTreasure} loot uncollected`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* ── Traps ── */}
      {trapCount > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            💣 Traps ({armedTraps} armed)
          </p>
          {traps!.map((trap) => (
            <div key={trap.id} className="flex items-center gap-2 text-sm min-w-0">
              {onToggleTrapDisarmed && (
                <button
                  onClick={() => onToggleTrapDisarmed(trap.id)}
                  className="shrink-0 hover:scale-110 transition-transform"
                  title={trap.disarmed ? 'Mark as armed' : 'Mark as disarmed'}
                >
                  {trap.disarmed ? '✅' : '💣'}
                </button>
              )}
              <span className={`truncate ${trap.disarmed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                {trap.name}
              </span>
              {trap.dc != null && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">DC {trap.dc}</Badge>
              )}
              {trap.damage && (
                <span className="text-xs text-muted-foreground">{trap.damage}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Exits ── */}
      {paths.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🚪 Exits
          </p>
          <div className="space-y-1">
            {paths.map((path) => {
              const isFrom = path.fromPoiId === currentPoiId
              const destId = isFrom ? path.toPoiId : path.fromPoiId
              const dest = isFrom ? path.toName : path.fromName
              const displayDir: Direction | null = path.direction
                ? (isFrom ? path.direction : OPPOSITE_DIRECTION[path.direction])
                : null
              return (
                <Link
                  key={path.id}
                  to="/realms/pois/$poiId"
                  params={{ poiId: destId }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors group min-w-0"
                >
                  {path.type === 'portal' ? (
                    <span className="text-sm shrink-0 w-8 text-center" title="Planar gate">🌀</span>
                  ) : displayDir ? (
                    <Badge variant="secondary" className="text-xs font-mono shrink-0 w-8 justify-center">
                      {displayDir.toUpperCase()}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0 w-8 text-center">→</span>
                  )}
                  <span className="text-sm font-medium group-hover:underline truncate min-w-0">
                    {path.type === 'portal' ? `leads to ${dest}` : dest}
                  </span>
                  {path.hasDoor && (
                    <span className="text-sm shrink-0" title={path.doorDescription || (path.isLocked ? 'Locked door' : 'Door')}>
                      {path.isLocked ? '🔒' : '🚪'}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {path.hexes != null
                      ? `${formatDistance(path.hexes)} · ${path.baseTravelWatches} ${path.baseTravelWatches === 1 ? 'watch' : 'watches'}`
                      : `${path.baseTravelWatches} ${path.baseTravelWatches === 1 ? 'watch' : 'watches'}`}
                  </span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-auto whitespace-nowrap ${path.type === 'portal' ? 'border-purple-400/60 text-purple-300' : ''}`}>{path.type}</Badge>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
