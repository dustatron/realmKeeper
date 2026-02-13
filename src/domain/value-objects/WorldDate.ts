import { SEASONS, DEFAULT_DAYS_PER_SEASON, DEFAULT_WATCHES_PER_DAY } from '@shared/constants'
import type { Season } from '@shared/constants'

export interface WorldDate {
  year: number
  season: Season
  day: number
}

export interface WorldDateTime extends WorldDate {
  watch: number  // 1-based
}

export function advanceWatch(
  dt: WorldDateTime,
  daysPerSeason = DEFAULT_DAYS_PER_SEASON,
  watchesPerDay = DEFAULT_WATCHES_PER_DAY
): WorldDateTime {
  if (dt.watch < watchesPerDay) {
    return { ...dt, watch: dt.watch + 1 }
  }
  return advanceDay({ ...dt, watch: 1 }, daysPerSeason)
}

export function advanceDay(
  dt: WorldDateTime,
  daysPerSeason = DEFAULT_DAYS_PER_SEASON
): WorldDateTime {
  const newDay = dt.day + 1
  if (newDay <= daysPerSeason) {
    return { ...dt, day: newDay, watch: 1 }
  }
  const seasonIdx = SEASONS.indexOf(dt.season)
  if (seasonIdx < SEASONS.length - 1) {
    return { ...dt, season: SEASONS[seasonIdx + 1], day: 1, watch: 1 }
  }
  return { year: dt.year + 1, season: SEASONS[0], day: 1, watch: 1 }
}

export function advanceWeek(
  dt: WorldDateTime,
  daysPerSeason = DEFAULT_DAYS_PER_SEASON,
  daysPerWeek = 7
): WorldDateTime {
  let result = dt
  for (let i = 0; i < daysPerWeek; i++) {
    result = advanceDay(result, daysPerSeason)
  }
  return result
}

export function rewindDay(
  dt: WorldDateTime,
  daysPerSeason = DEFAULT_DAYS_PER_SEASON,
  watchesPerDay = DEFAULT_WATCHES_PER_DAY
): WorldDateTime {
  const prevDay = dt.day - 1
  if (prevDay >= 1) {
    return { ...dt, day: prevDay, watch: watchesPerDay }
  }
  const seasonIdx = SEASONS.indexOf(dt.season)
  if (seasonIdx > 0) {
    return { ...dt, season: SEASONS[seasonIdx - 1], day: daysPerSeason, watch: watchesPerDay }
  }
  return {
    year: dt.year - 1,
    season: SEASONS[SEASONS.length - 1],
    day: daysPerSeason,
    watch: watchesPerDay,
  }
}

export function formatWorldDate(dt: WorldDate): string {
  return `${dt.season.charAt(0).toUpperCase() + dt.season.slice(1)} ${dt.day}, Year ${dt.year}`
}

export function formatWorldDateTime(dt: WorldDateTime): string {
  return `${formatWorldDate(dt)} (Watch ${dt.watch})`
}
