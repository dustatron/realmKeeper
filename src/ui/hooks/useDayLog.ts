import { queryDb, Schema } from '@livestore/livestore'
import { useMemo } from 'react'
import { useQuery } from '@livestore/react'
import { poiEventsTable } from '@infrastructure/livestore/tables'
import { parseJsonRows } from '@shared/parseJsonRow'
import { useAllWeather } from './useWeather'
import { useAllEvents } from './useTimeline'
import { useActiveRealm } from './useActiveRealm'
import { toDayKey, fromDayKey, dayKeyRange } from '@domain/value-objects/DayKey'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { Season } from '@shared/constants'

export interface DayLogEntry {
  dayKey: number
  campaignDay: number
  year: number
  season: Season
  day: number
  weather: WeatherHistory[]
  factionTurns: WorldEvent[]
  events: WorldEvent[]
  gmNotes: WorldEvent[]
  scheduledEvents: POIEvent[]
  isCurrentDay: boolean
  isFuture: boolean
  isCompleted: boolean
}

export function useDayLog(
  worldId: string | null,
  pageStartKey: number,
  pageSize: number
): DayLogEntry[] {
  const realm = useActiveRealm()
  const allWeather = useAllWeather(worldId)
  const allEvents = useAllEvents(worldId)

  const poiEvents = useQuery(
    queryDb(
      worldId
        ? poiEventsTable.select().where({ worldId })
        : { query: 'SELECT * FROM poiEvents WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: worldId ?? '', map: parseJsonRows }
    )
  ) as POIEvent[]

  return useMemo(() => {
    if (!realm) return []
    const dps = realm.daysPerSeason

    // Build lookup maps: dayKey -> items
    const weatherMap = new Map<number, WeatherHistory[]>()
    for (const w of allWeather) {
      const k = toDayKey(w.year, w.season, w.day, dps)
      const arr = weatherMap.get(k) ?? []
      arr.push(w)
      weatherMap.set(k, arr)
    }

    const factionTurnMap = new Map<number, WorldEvent[]>()
    const eventMap = new Map<number, WorldEvent[]>()
    const gmNoteMap = new Map<number, WorldEvent[]>()

    for (const e of allEvents) {
      const k = toDayKey(e.year, e.season, e.day, dps)
      if (e.type === 'faction_turn') {
        const arr = factionTurnMap.get(k) ?? []
        arr.push(e)
        factionTurnMap.set(k, arr)
      } else if (e.type === 'gm_note') {
        const arr = gmNoteMap.get(k) ?? []
        arr.push(e)
        gmNoteMap.set(k, arr)
      } else if (e.type !== 'clock_advance') {
        // Filter out clock_advance noise
        const arr = eventMap.get(k) ?? []
        arr.push(e)
        eventMap.set(k, arr)
      }
    }

    // Build POI event lookup: key by trigger day+season (recurring match any year)
    const poiEventMap = new Map<number, POIEvent[]>()
    for (const pe of poiEvents) {
      if (pe.trigger.year !== null) {
        const k = toDayKey(pe.trigger.year ?? 0, pe.trigger.season, pe.trigger.day, dps)
        const arr = poiEventMap.get(k) ?? []
        arr.push(pe)
        poiEventMap.set(k, arr)
      }
    }
    // Separate recurring events for matching
    const recurringEvents = poiEvents.filter((pe) => pe.trigger.year === null)

    const currentDayKey = toDayKey(realm.currentYear, realm.currentSeason, realm.currentDay, dps)
    const completedThrough = realm.completedThroughDay ?? -1
    const day1Key = toDayKey(1, 'spring', 1, dps)

    const keys = dayKeyRange(pageStartKey, pageSize)
    return keys.map((dk): DayLogEntry => {
      const { year, season, day } = fromDayKey(dk, dps)

      const scheduled = poiEventMap.get(dk) ?? []
      const recurringMatches = recurringEvents.filter(
        (pe) => pe.trigger.season === season && pe.trigger.day === day
      )

      return {
        dayKey: dk,
        campaignDay: dk - day1Key + 1,
        year,
        season,
        day,
        weather: weatherMap.get(dk) ?? [],
        factionTurns: factionTurnMap.get(dk) ?? [],
        events: eventMap.get(dk) ?? [],
        gmNotes: gmNoteMap.get(dk) ?? [],
        scheduledEvents: [...scheduled, ...recurringMatches],
        isCurrentDay: dk === currentDayKey,
        isFuture: dk > currentDayKey,
        isCompleted: dk <= completedThrough,
      }
    })
  }, [realm, allWeather, allEvents, poiEvents, pageStartKey, pageSize])
}
