import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import { createClockAdvancedEvent } from '@domain/events/ClockAdvanced'
import { createWeatherRolledEvent } from '@domain/events/WeatherRolled'
import type { AdvanceClockPreview } from './AdvanceClock'
import type { ClockAdvanceUnit } from '@domain/services/ClockEngine'
import { newId } from '@shared/ulid'

export interface CommitClockAdvanceDeps {
  realmRepo: IRealmRepository
  weatherRepo: IWeatherRepository
  worldEventRepo: IWorldEventRepository
  eventBus: IEventBus
}

export async function executeCommitClockAdvance(
  worldId: string,
  unit: ClockAdvanceUnit,
  preview: AdvanceClockPreview,
  deps: CommitClockAdvanceDeps
): Promise<void> {
  const realm = await deps.realmRepo.getById(worldId)
  if (!realm) return

  // Update realm's current date/time
  await deps.realmRepo.update({
    ...realm,
    currentYear: preview.newDateTime.year,
    currentSeason: preview.newDateTime.season,
    currentDay: preview.newDateTime.day,
    currentWatch: preview.newDateTime.watch,
    updatedAt: Date.now(),
  })

  const dt = preview.newDateTime

  // Persist weather
  if (preview.weather) {
    await deps.weatherRepo.create({
      id: newId(),
      worldId,
      year: dt.year,
      season: dt.season,
      day: dt.day,
      watch: dt.watch,
      condition: preview.weather.condition,
      severity: preview.weather.severity,
      createdAt: Date.now(),
    })

    deps.eventBus.publish(
      createWeatherRolledEvent(
        worldId,
        preview.weather.condition,
        preview.weather.severity,
        dt.season,
        dt.year,
        dt.day,
        dt.watch,
        preview.weather.diceResult.rolls,
        preview.weather.diceResult.total
      )
    )
  }

  // Log clock advance as world event
  await deps.worldEventRepo.create({
    id: newId(),
    worldId,
    year: dt.year,
    season: dt.season,
    day: dt.day,
    watch: dt.watch,
    type: 'clock_advance',
    title: `Time advanced (${unit})`,
    description: `Clock moved from ${preview.previousDateTime.season} ${preview.previousDateTime.day} to ${dt.season} ${dt.day}.`,
    relatedEntityIds: [],
    createdAt: Date.now(),
  })

  deps.eventBus.publish(
    createClockAdvancedEvent(worldId, unit, preview.previousDateTime, preview.newDateTime, [])
  )
}
