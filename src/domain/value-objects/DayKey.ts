import { SEASONS } from '@shared/constants'
import type { Season } from '@shared/constants'

/**
 * Linear day encoding: (year * seasonsPerYear * daysPerSeason) + (seasonIdx * daysPerSeason) + (day - 1)
 * Enables arithmetic across season/year boundaries for pagination.
 */
export function toDayKey(year: number, season: Season, day: number, daysPerSeason: number): number {
  const seasonIdx = SEASONS.indexOf(season)
  return year * (SEASONS.length * daysPerSeason) + seasonIdx * daysPerSeason + (day - 1)
}

export function fromDayKey(key: number, daysPerSeason: number): { year: number; season: Season; day: number } {
  const totalPerYear = SEASONS.length * daysPerSeason
  const year = Math.floor(key / totalPerYear)
  const remainder = key % totalPerYear
  const seasonIdx = Math.floor(remainder / daysPerSeason)
  const day = (remainder % daysPerSeason) + 1
  return { year, season: SEASONS[seasonIdx], day }
}

export function dayKeyRange(startKey: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => startKey + i)
}

/**
 * Ordinal "campaign day" — 1 at Year 1, Spring, Day 1; increments by 1 each day
 * across season/year boundaries. The stable anchor for cycles like moon phases.
 */
export function campaignDayOf(year: number, season: Season, day: number, daysPerSeason: number): number {
  return toDayKey(year, season, day, daysPerSeason) - toDayKey(1, 'spring', 1, daysPerSeason) + 1
}
