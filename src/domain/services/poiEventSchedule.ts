import type { POIEvent } from '@domain/entities/POIEvent'
import { SEASONS, type Season } from '@shared/constants'

interface DT { year: number; season: Season; day: number; watch: number }

// Absolute watch index. Watches are 1-based (1..watchesPerDay), so the in-day
// offset is (watch - 1).
const absWatch = (year: number, season: Season, day: number, watch: number, daysPerSeason: number, watchesPerDay: number): number =>
  ((((year - 1) * 4 + SEASONS.indexOf(season)) * daysPerSeason + (day - 1)) * watchesPerDay) + (watch - 1)

export function isEventActiveOn(evt: POIEvent, dt: DT, daysPerSeason: number, watchesPerDay: number): boolean {
  const t = evt.trigger
  const triggerYear = t.year ?? dt.year // recurring: anchor to the current year
  const triggerWatch = t.watch ?? 1 // null = start of day (1-based)
  const start = absWatch(triggerYear, t.season, t.day, triggerWatch, daysPerSeason, watchesPerDay)
  const end = start + Math.max(1, evt.durationWatches)
  const nowAbs = absWatch(dt.year, dt.season, dt.day, dt.watch, daysPerSeason, watchesPerDay)
  return nowAbs >= start && nowAbs < end
}
