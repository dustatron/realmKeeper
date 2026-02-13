import { advanceClock, type ClockAdvanceUnit } from '@domain/services/ClockEngine'
import { rollWeather, type WeatherResult } from '@domain/services/WeatherEngine'
import { rollAllFactionTurns, type FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'
import { executeConfirmFactionTurn } from './ConfirmFactionTurn'
import { createClockAdvancedEvent } from '@domain/events/ClockAdvanced'
import { createWeatherRolledEvent } from '@domain/events/WeatherRolled'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import { advanceDay, type WorldDateTime } from '@domain/value-objects/WorldDate'
import type { DiceResult } from '@shared/dice'
import { newId } from '@shared/ulid'

/* ── Legacy preview-based advance (kept for backward compat) ── */

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

  if (triggers.some((t) => t.type === 'weather_roll')) {
    const recentWeather = await deps.weatherRepo.getRecent(realmId, 1)
    const previousSeverity = recentWeather.length > 0 ? recentWeather[0].severity : null

    preview.weather = rollWeather(
      clockResult.newDateTime.season,
      previousSeverity,
      deps.rollDice
    )
  }

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

/* ── Auto-apply advance day (Calendar V2) ── */

export interface AdvanceDayDeps {
  realmRepo: IRealmRepository
  weatherRepo: IWeatherRepository
  factionRepo: IFactionRepository
  relationshipRepo: IFactionRelationshipRepository
  npcRepo: INPCRepository
  worldEventRepo: IWorldEventRepository
  eventBus: IEventBus
  rollDice: (notation: string) => DiceResult
}

export interface AdvanceDayResult {
  previousDateTime: WorldDateTime
  newDateTime: WorldDateTime
  weather: WeatherResult
  factionTurns: FactionTurnSuggestion[]
}

/**
 * Advance by 1 day, auto-roll weather, auto-apply faction turns. No confirmation needed.
 * For week advances, call this N times (once per day in the week).
 * Faction turns only fire when realm.factionTurnTrigger === 'day'.
 * For week-triggered faction turns, call executeFactionTurns separately after the loop.
 */
export async function executeAdvanceDay(
  realmId: string,
  deps: AdvanceDayDeps
): Promise<AdvanceDayResult | null> {
  const realm = await deps.realmRepo.getById(realmId)
  if (!realm) return null

  const current: WorldDateTime = {
    year: realm.currentYear,
    season: realm.currentSeason,
    day: realm.currentDay,
    watch: realm.currentWatch,
  }

  // Advance 1 day
  const newDateTime = advanceDay(current, realm.daysPerSeason)
  const now = Date.now()

  // Roll + persist weather
  const recentWeather = await deps.weatherRepo.getRecent(realmId, 1)
  const previousSeverity = recentWeather.length > 0 ? recentWeather[0].severity : null
  const weather = rollWeather(newDateTime.season, previousSeverity, deps.rollDice)

  await deps.weatherRepo.create({
    id: newId(),
    realmId,
    year: newDateTime.year,
    season: newDateTime.season,
    day: newDateTime.day,
    watch: newDateTime.watch,
    condition: weather.condition,
    severity: weather.severity,
    createdAt: now,
  })

  // Roll + auto-apply faction turns (if trigger === 'day')
  let factionTurns: FactionTurnSuggestion[] = []
  if (realm.factionTurnTrigger === 'day') {
    factionTurns = await executeFactionTurns(realmId, newDateTime, deps)
  }

  // Update realm date
  await deps.realmRepo.update({
    ...realm,
    currentYear: newDateTime.year,
    currentSeason: newDateTime.season,
    currentDay: newDateTime.day,
    currentWatch: newDateTime.watch,
    updatedAt: Date.now(),
  })

  // Publish events
  deps.eventBus.publish(createClockAdvancedEvent(realmId, 'day', current, newDateTime, []))
  deps.eventBus.publish(
    createWeatherRolledEvent(
      realmId, weather.condition, weather.severity,
      newDateTime.season, newDateTime.year, newDateTime.day, newDateTime.watch,
      weather.diceResult.rolls, weather.diceResult.total
    )
  )

  return { previousDateTime: current, newDateTime, weather, factionTurns }
}

/** Roll + apply faction turns for the current date. Used for week-triggered turns. */
export async function executeFactionTurns(
  realmId: string,
  dt: WorldDateTime,
  deps: AdvanceDayDeps
): Promise<FactionTurnSuggestion[]> {
  const factions = await deps.factionRepo.getByRealmId(realmId)
  const npcs = await deps.npcRepo.getByRealmId(realmId)
  const factionIds = factions.map((f) => f.id)
  const relationships = await deps.relationshipRepo.getAllForRealm(realmId, factionIds)

  const suggestions = rollAllFactionTurns(factions, npcs, relationships, deps.rollDice)

  // Auto-apply all faction turns (no GM confirmation)
  await executeConfirmFactionTurn(realmId, suggestions, dt, {
    factionRepo: deps.factionRepo,
    relationshipRepo: deps.relationshipRepo,
    worldEventRepo: deps.worldEventRepo,
    eventBus: deps.eventBus,
  })

  return suggestions
}
