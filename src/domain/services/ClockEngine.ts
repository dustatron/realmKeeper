import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import { advanceWatch, advanceDay, advanceWeek } from '@domain/value-objects/WorldDate'

export type ClockAdvanceUnit = 'watch' | 'day' | 'week'

export interface ClockAdvanceResult {
  previousDateTime: WorldDateTime
  newDateTime: WorldDateTime
  triggers: ClockTrigger[]
}

export type ClockTrigger =
  | { type: 'new_watch' }
  | { type: 'new_day' }
  | { type: 'new_season'; season: string }
  | { type: 'new_year'; year: number }
  | { type: 'weather_roll' }
  | { type: 'faction_turn_check' }

export function advanceClock(
  current: WorldDateTime,
  unit: ClockAdvanceUnit,
  daysPerSeason: number,
  daysPerWeek = 7
): ClockAdvanceResult {
  const previousDateTime = { ...current }
  let newDateTime: WorldDateTime

  switch (unit) {
    case 'watch':
      newDateTime = advanceWatch(current, daysPerSeason)
      break
    case 'day':
      newDateTime = advanceDay(current, daysPerSeason)
      break
    case 'week':
      newDateTime = advanceWeek(current, daysPerSeason, daysPerWeek)
      break
  }

  const triggers = deriveTriggers(previousDateTime, newDateTime)
  return { previousDateTime, newDateTime, triggers }
}

function deriveTriggers(prev: WorldDateTime, next: WorldDateTime): ClockTrigger[] {
  const triggers: ClockTrigger[] = []

  // Always fire new_watch
  triggers.push({ type: 'new_watch' })

  // Did the day change?
  const dayChanged = prev.day !== next.day || prev.season !== next.season || prev.year !== next.year
  if (dayChanged) {
    triggers.push({ type: 'new_day' })
    // Weather rolls on each new day
    triggers.push({ type: 'weather_roll' })
    // Faction turn check on each new day
    triggers.push({ type: 'faction_turn_check' })
  }

  // Did the season change?
  if (prev.season !== next.season || prev.year !== next.year) {
    triggers.push({ type: 'new_season', season: next.season })
  }

  // Did the year change?
  if (prev.year !== next.year) {
    triggers.push({ type: 'new_year', year: next.year })
  }

  return triggers
}
