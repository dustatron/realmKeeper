import { advanceClock, type ClockAdvanceUnit } from '@domain/services/ClockEngine'
import { rollWeather, type WeatherResult } from '@domain/services/WeatherEngine'
import { rollAllFactionTurns, type FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import type { DiceResult } from '@shared/dice'

export interface AdvanceClockDeps {
  realmRepo: IRealmRepository
  weatherRepo: IWeatherRepository
  factionRepo: IFactionRepository
  relationshipRepo: IFactionRelationshipRepository
  npcRepo: INPCRepository
  rollDice: (notation: string) => DiceResult
}

export interface AdvanceClockPreview {
  previousDateTime: WorldDateTime
  newDateTime: WorldDateTime
  weather?: WeatherResult
  factionTurnSuggestions?: FactionTurnSuggestion[]
  triggeredNewDay: boolean
  triggeredNewSeason: boolean
  triggeredNewYear: boolean
}

export async function executeAdvanceClock(
  realmId: string,
  unit: ClockAdvanceUnit,
  deps: AdvanceClockDeps
): Promise<AdvanceClockPreview | null> {
  const realm = await deps.realmRepo.getById(realmId)
  if (!realm) return null

  const current: WorldDateTime = {
    year: realm.currentYear,
    season: realm.currentSeason,
    day: realm.currentDay,
    watch: realm.currentWatch,
  }

  const clockResult = advanceClock(current, unit, realm.daysPerSeason)
  const triggers = clockResult.triggers

  const preview: AdvanceClockPreview = {
    previousDateTime: clockResult.previousDateTime,
    newDateTime: clockResult.newDateTime,
    triggeredNewDay: triggers.some((t) => t.type === 'new_day'),
    triggeredNewSeason: triggers.some((t) => t.type === 'new_season'),
    triggeredNewYear: triggers.some((t) => t.type === 'new_year'),
  }

  // Roll weather on day change
  if (triggers.some((t) => t.type === 'weather_roll')) {
    const recentWeather = await deps.weatherRepo.getRecent(realmId, 1)
    const previousSeverity = recentWeather.length > 0 ? recentWeather[0].severity : null

    preview.weather = rollWeather(
      clockResult.newDateTime.season,
      previousSeverity,
      deps.rollDice
    )
  }

  // Check faction turn trigger
  if (triggers.some((t) => t.type === 'faction_turn_check')) {
    const shouldTrigger =
      realm.factionTurnTrigger === 'day' ||
      (realm.factionTurnTrigger === 'week' && unit === 'week')

    if (shouldTrigger) {
      const factions = await deps.factionRepo.getByRealmId(realmId)
      const npcs = await deps.npcRepo.getByRealmId(realmId)
      const factionIds = factions.map((f) => f.id)
      const relationships = await deps.relationshipRepo.getAllForRealm(realmId, factionIds)

      preview.factionTurnSuggestions = rollAllFactionTurns(
        factions, npcs, relationships, deps.rollDice
      )
    }
  }

  return preview
}
