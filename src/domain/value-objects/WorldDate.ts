import { SEASONS, WATCHES, DEFAULT_DAYS_PER_SEASON } from '@shared/constants'
import type { Season, Watch } from '@shared/constants'

export interface WorldDate {
  year: number
  season: Season
  day: number
}

export interface WorldDateTime extends WorldDate {
  watch: Watch
}

export function advanceWatch(dt: WorldDateTime, daysPerSeason = DEFAULT_DAYS_PER_SEASON): WorldDateTime {
  const watchIdx = WATCHES.indexOf(dt.watch)
  if (watchIdx < WATCHES.length - 1) {
    return { ...dt, watch: WATCHES[watchIdx + 1] }
  }
  return advanceDay({ ...dt, watch: WATCHES[0] }, daysPerSeason)
}

export function advanceDay(dt: WorldDateTime, daysPerSeason = DEFAULT_DAYS_PER_SEASON): WorldDateTime {
  const newDay = dt.day + 1
  if (newDay <= daysPerSeason) {
    return { ...dt, day: newDay, watch: WATCHES[0] }
  }
  const seasonIdx = SEASONS.indexOf(dt.season)
  if (seasonIdx < SEASONS.length - 1) {
    return { ...dt, season: SEASONS[seasonIdx + 1], day: 1, watch: WATCHES[0] }
  }
  return { year: dt.year + 1, season: SEASONS[0], day: 1, watch: WATCHES[0] }
}

export function advanceWeek(dt: WorldDateTime, daysPerSeason = DEFAULT_DAYS_PER_SEASON): WorldDateTime {
  let result = dt
  for (let i = 0; i < 7; i++) {
    result = advanceDay(result, daysPerSeason)
  }
  return result
}

export function formatWorldDate(dt: WorldDate): string {
  return `${dt.season.charAt(0).toUpperCase() + dt.season.slice(1)} ${dt.day}, Year ${dt.year}`
}

export function formatWorldDateTime(dt: WorldDateTime): string {
  return `${formatWorldDate(dt)} (${dt.watch})`
}
