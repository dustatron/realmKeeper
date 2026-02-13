import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { DayLogEntry } from '~/ui/hooks/useDayLog'
import { Badge } from '~/components/ui/badge'
import { ChevronRight, Swords } from 'lucide-react'
import { cn } from '~/lib/utils'
import { InlineGMNote } from './InlineGMNote'

const SEASON_COLORS: Record<string, string> = {
  spring: 'text-green-600',
  summer: 'text-amber-600',
  fall: 'text-orange-600',
  winter: 'text-blue-600',
}

interface DayLogRowProps {
  entry: DayLogEntry
  realmId: string
  showSeasonDivider: boolean
  onMarkComplete: (dayKey: number) => void
}

function getSeverityVariant(severity: string) {
  switch (severity) {
    case 'extreme': return 'outline' as const
    case 'catastrophic': return 'destructive' as const
    default: return 'secondary' as const
  }
}

export function DayLogRow({ entry, realmId, showSeasonDivider, onMarkComplete }: DayLogRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const primaryWeather = entry.weather[0]
  const hasFactionTurns = entry.factionTurns.length > 0

  return (
    <>
      {/* Season divider row */}
      {showSeasonDivider && (
        <tr>
          <td colSpan={6} className={cn('px-3 py-1 text-xs font-semibold tracking-wide', SEASON_COLORS[entry.season], 'bg-muted/40')}>
            {cap(entry.season)} &mdash; Year {entry.year}
          </td>
        </tr>
      )}

      <tr
        onClick={hasFactionTurns ? () => setIsOpen((o) => !o) : undefined}
        className={cn(
          'border-b transition-colors',
          hasFactionTurns && 'cursor-pointer hover:bg-muted/50',
          entry.isCompleted && 'opacity-40',
          entry.isCurrentDay && 'border-l-4 border-l-primary bg-primary/5',
          entry.isFuture && !entry.isCurrentDay && 'text-muted-foreground',
        )}
      >
        {/* Completed checkbox */}
        <td className="w-8 px-2 py-2 align-middle">
          {!entry.isFuture && (
            <input
              type="checkbox"
              checked={entry.isCompleted}
              onChange={(e) => {
                e.stopPropagation()
                onMarkComplete(entry.dayKey)
              }}
              onClick={(e) => e.stopPropagation()}
              className="size-3.5 rounded cursor-pointer"
            />
          )}
        </td>

        {/* Campaign Day */}
        <td className="px-2 py-2 align-middle whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{entry.campaignDay}</span>
            {entry.isCurrentDay && (
              <Badge variant="default" className="text-[10px] h-4 px-1">Now</Badge>
            )}
          </div>
        </td>

        {/* Season + Day within season */}
        <td className={cn('px-2 py-2 align-middle text-sm', SEASON_COLORS[entry.season])}>
          {cap(entry.season)} {entry.day}
        </td>

        {/* Weather */}
        <td className="px-2 py-2 align-middle">
          {primaryWeather ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm truncate max-w-[8rem]">{primaryWeather.condition}</span>
              {primaryWeather.severity !== 'normal' && (
                <Badge variant={getSeverityVariant(primaryWeather.severity)} className="text-[10px] h-4 px-1">
                  {primaryWeather.severity}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">--</span>
          )}
        </td>

        {/* Faction Turns */}
        <td className="px-2 py-2 align-middle">
          {hasFactionTurns ? (
            <div className="flex items-center gap-1">
              <ChevronRight className={cn('size-3 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
              <Badge variant="secondary" className="text-xs">
                <Swords className="size-3 mr-1" />
                {entry.factionTurns.length}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">--</span>
          )}
        </td>

        {/* Notes */}
        <td className="px-2 py-2 align-middle max-w-[12rem]" onClick={(e) => e.stopPropagation()}>
          <InlineGMNote
            existingNote={entry.gmNotes[0]}
            realmId={realmId}
            year={entry.year}
            season={entry.season}
            day={entry.day}
          />
        </td>
      </tr>

      {/* Expanded faction turn details */}
      {isOpen && hasFactionTurns && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-2">
            <ul className="space-y-1.5">
              {entry.factionTurns.map((ft) => {
                const factionId = ft.relatedEntityIds[0]
                return (
                  <li key={ft.id} className="flex items-start gap-2 text-sm">
                    <Swords className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      {factionId ? (
                        <Link
                          to="/realms/factions/$factionId"
                          params={{ factionId }}
                          className="font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ft.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{ft.title}</span>
                      )}
                      {ft.description && (
                        <p className="text-xs text-muted-foreground">{ft.description}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}
