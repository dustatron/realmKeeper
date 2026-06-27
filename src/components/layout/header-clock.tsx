import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Cloud, CalendarClock } from 'lucide-react'
import { db } from '@infrastructure/dexie/db'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useContainer } from '~/ui/hooks/useContainer'
import { useCurrentWeather } from '~/ui/hooks/useWeather'
import {
  executeAdvanceDay,
  executeAdvanceWatch,
  type AdvanceDayDeps,
} from '@application/use-cases/AdvanceClock'
import { rollDice } from '@shared/dice'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu'

const SEVERITY_CLASS: Record<string, string> = {
  normal: 'text-muted-foreground',
  extreme: 'text-amber-600 dark:text-amber-500',
  catastrophic: 'text-red-600 dark:text-red-500',
}

const chipClass =
  'inline-flex items-center gap-1 rounded-md border px-2 h-7 text-xs font-medium hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors'

export function HeaderClock() {
  const realm = useActiveRealm()
  const container = useContainer()
  const [advancing, setAdvancing] = useState(false)

  const worldId = realm?.id ?? null
  const weather = useCurrentWeather(
    worldId,
    realm?.currentYear ?? null,
    realm?.currentSeason ?? null,
    realm?.currentDay ?? null
  )
  const activeEvents =
    useLiveQuery(
      () =>
        worldId
          ? db.poiEvents
              .where('worldId')
              .equals(worldId)
              .toArray()
              .then((events) => events.filter((e) => e.isActive))
          : [],
      [worldId]
    ) ?? []

  if (!realm) return null

  const buildDeps = (): AdvanceDayDeps => ({
    realmRepo: container.realmRepo,
    weatherRepo: container.weatherRepo,
    factionRepo: container.factionRepo,
    relationshipRepo: container.factionRelationshipRepo,
    npcRepo: container.npcRepo,
    worldEventRepo: container.worldEventRepo,
    eventBus: container.eventBus,
    rollDice,
    poiEventRepo: container.poiEventRepo,
  })

  const advance = async (
    fn: (worldId: string, deps: AdvanceDayDeps) => Promise<unknown>
  ) => {
    if (advancing) return
    setAdvancing(true)
    try {
      await fn(realm.id, buildDeps())
    } finally {
      setAdvancing(false)
    }
  }

  const season = realm.currentSeason.charAt(0).toUpperCase() + realm.currentSeason.slice(1)

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => advance(executeAdvanceDay)}
        disabled={advancing}
        title="Advance one day"
        className={chipClass}
      >
        <span className="hidden sm:inline">
          {season} {realm.currentDay}
        </span>
        <span className="sm:hidden">D{realm.currentDay}</span>
        <ChevronRight className="size-3 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={() => advance(executeAdvanceWatch)}
        disabled={advancing}
        title="Advance one watch"
        className={chipClass}
      >
        <span className="hidden sm:inline">Watch&nbsp;</span>
        {realm.currentWatch}/{realm.watchesPerDay}
        <ChevronRight className="size-3 text-muted-foreground" />
      </button>

      {weather && (
        <span
          className={`hidden md:inline-flex items-center gap-1 px-1.5 h-7 text-xs ${SEVERITY_CLASS[weather.severity] ?? 'text-muted-foreground'}`}
          title={`Weather: ${weather.condition}`}
        >
          <Cloud className="size-3.5 shrink-0" />
          <span className="max-w-[10rem] truncate">{weather.condition}</span>
        </span>
      )}

      {activeEvents.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Active events"
              className="relative inline-flex items-center justify-center size-7 rounded-md border hover:bg-accent transition-colors"
            >
              <CalendarClock className="size-4" />
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none">
                {activeEvents.length}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Active events</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activeEvents.map((evt) => (
              <DropdownMenuItem key={evt.id} asChild>
                <Link
                  to="/realms/events/$eventId"
                  params={{ eventId: evt.id }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{evt.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{evt.type}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
