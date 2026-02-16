import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAllWeather } from './useWeather'
import { useAllEvents } from './useTimeline'
import { useActiveRealm } from './useActiveRealm'
import { toDayKey, fromDayKey, dayKeyRange } from '@domain/value-objects/DayKey'
import { db } from '@infrastructure/dexie/db'
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

  // Load POI events for this realm
  const poiEvents = useLiveQuery(
    async () => {
      if (!worldId) return []
      return await db.poiEvents.where('worldId').equals(worldId).toArray()
    },
    [worldId]
  ) ?? []

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
      // For recurring events with no year, add to every matching season+day
      // For specific-year events, add to that exact day
      const k = toDayKey(pe.trigger.year ?? 0, pe.trigger.season, pe.trigger.day, dps)
      if (pe.trigger.year !== null) {
        const arr = poiEventMap.get(k) ?? []
        arr.push(pe)
        poiEventMap.set(k, arr)
      } else {
        // Recurring: store with season+day key, match by ignoring year
        // We'll use a special approach below
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

      // Match POI events for this day
      const scheduled = poiEventMap.get(dk) ?? []
      // Also match recurring events by season+day
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
