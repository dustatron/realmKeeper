import type { Realm } from '@domain/entities/Realm'
import { toDayKey } from '@domain/value-objects/DayKey'
import { Button } from '~/components/ui/button'
import { ChevronLeft, ChevronRight, FastForward } from 'lucide-react'

const SEASON_COLORS: Record<string, string> = {
  spring: 'text-green-500',
  summer: 'text-yellow-500',
  fall: 'text-orange-500',
  winter: 'text-blue-500',
}

interface StickyTimeBarProps {
  realm: Realm
  isAdvancing: boolean
  onRewindDay: () => void
  onAdvanceDay: () => void
  onAdvanceWeek: () => void
}

export function StickyTimeBar({ realm, isAdvancing, onRewindDay, onAdvanceDay, onAdvanceWeek }: StickyTimeBarProps) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const day1Key = toDayKey(1, 'spring', 1, realm.daysPerSeason)
  const currentKey = toDayKey(realm.currentYear, realm.currentSeason, realm.currentDay, realm.daysPerSeason)
  const campaignDay = currentKey - day1Key + 1

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Rewind */}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          onClick={onRewindDay}
          disabled={isAdvancing || (realm.currentYear === 1 && realm.currentSeason === 'spring' && realm.currentDay === 1)}
        >
          <ChevronLeft className="size-4 mr-1" />Day
        </Button>

        {/* Current date display */}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span>Day {campaignDay}</span>
          <span className="text-muted-foreground">&middot;</span>
          <span className={SEASON_COLORS[realm.currentSeason]}>{cap(realm.currentSeason)}</span>
          <span className="text-muted-foreground">&middot;</span>
          <span>Day {realm.currentDay}</span>
          <span className="text-muted-foreground">&middot;</span>
          <span className="text-sm">Watch {realm.currentWatch}</span>
        </div>

        {/* Advance */}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAdvanceDay} disabled={isAdvancing}>
            Day<ChevronRight className="size-4 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAdvanceWeek} disabled={isAdvancing}>
            Week<FastForward className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
