import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import { rewindDay, type WorldDateTime } from '@domain/value-objects/WorldDate'

export interface RewindDayDeps {
  realmRepo: IRealmRepository
  weatherRepo: IWeatherRepository
  worldEventRepo: IWorldEventRepository
}

export interface RewindDayResult {
  previousDateTime: WorldDateTime
  newDateTime: WorldDateTime
  deletedWeatherCount: number
  deletedEventCount: number
}

/**
 * Rewind the realm clock by 1 day.
 * Deletes all generated weather and events for the current day (preserves gm_note events).
 * Returns null if already at Day 1 Year 1.
 */
export async function executeRewindDay(
  worldId: string,
  deps: RewindDayDeps
): Promise<RewindDayResult | null> {
  const realm = await deps.realmRepo.getById(worldId)
  if (!realm) return null

  const current: WorldDateTime = {
    year: realm.currentYear,
    season: realm.currentSeason,
    day: realm.currentDay,
    watch: realm.currentWatch,
  }

  // Can't rewind before the start of time
  if (current.year === 1 && current.season === 'spring' && current.day === 1) {
    return null
  }

  // Delete weather for current day
  const weatherForDay = await deps.weatherRepo.getByDate(
    worldId, current.year, current.season, current.day
  )
  for (const w of weatherForDay) {
    await deps.weatherRepo.delete(w.id)
  }

  // Delete generated events for current day (keep gm_notes)
  const eventsForDay = await deps.worldEventRepo.getByDate(
    worldId, current.year, current.season, current.day
  )
  const generatedEvents = eventsForDay.filter((e) => e.type !== 'gm_note')
  for (const e of generatedEvents) {
    await deps.worldEventRepo.delete(e.id)
  }

  // Move back 1 day
  const newDateTime = rewindDay(current, realm.daysPerSeason, realm.watchesPerDay)

  // Update realm
  await deps.realmRepo.update({
    ...realm,
    currentYear: newDateTime.year,
    currentSeason: newDateTime.season,
    currentDay: newDateTime.day,
    currentWatch: newDateTime.watch,
    updatedAt: Date.now(),
  })

  return {
    previousDateTime: current,
    newDateTime,
    deletedWeatherCount: weatherForDay.length,
    deletedEventCount: generatedEvents.length,
  }
}
