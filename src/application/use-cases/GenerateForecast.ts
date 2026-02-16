import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import { rollWeather, type WeatherSeverity } from '@domain/services/WeatherEngine'
import { advanceDay, type WorldDateTime } from '@domain/value-objects/WorldDate'
import type { DiceResult } from '@shared/dice'
import { newId } from '@shared/ulid'

export interface GenerateForecastDeps {
  realmRepo: IRealmRepository
  weatherRepo: IWeatherRepository
  rollDice: (notation: string) => DiceResult
}

const FORECAST_DAYS = 7

/**
 * Ensure weather records exist for the next N days after the current realm date.
 * Skips days that already have weather. Chains severity for catastrophic upgrades.
 */
export async function executeGenerateForecast(
  worldId: string,
  deps: GenerateForecastDeps
): Promise<number> {
  const realm = await deps.realmRepo.getById(worldId)
  if (!realm) return 0

  let cursor: WorldDateTime = {
    year: realm.currentYear,
    season: realm.currentSeason,
    day: realm.currentDay,
    watch: realm.currentWatch,
  }

  // Get the most recent weather to chain severity
  const recent = await deps.weatherRepo.getRecent(worldId, 1)
  let prevSeverity: WeatherSeverity | null = recent.length > 0 ? recent[0].severity : null

  let generated = 0

  for (let i = 0; i < FORECAST_DAYS; i++) {
    cursor = advanceDay(cursor, realm.daysPerSeason)

    // Check if weather already exists for this day
    const existing = await deps.weatherRepo.getByDate(worldId, cursor.year, cursor.season, cursor.day)
    if (existing.length > 0) {
      prevSeverity = existing[existing.length - 1].severity
      continue
    }

    const result = rollWeather(cursor.season, prevSeverity, deps.rollDice)

    await deps.weatherRepo.create({
      id: newId(),
      worldId,
      year: cursor.year,
      season: cursor.season,
      day: cursor.day,
      watch: cursor.watch,
      condition: result.condition,
      severity: result.severity,
      createdAt: Date.now(),
    })

    prevSeverity = result.severity
    generated++
  }

  return generated
}
