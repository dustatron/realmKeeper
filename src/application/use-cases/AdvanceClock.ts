import { advanceClock, type ClockAdvanceUnit } from '@domain/services/ClockEngine'
import { isEventActiveOn } from '@domain/services/poiEventSchedule'
import { rollWeather, type WeatherResult } from '@domain/services/WeatherEngine'
import { rollAllFactionTurns, type FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'
import { rollDoomTick, type DoomTickSuggestion } from '@domain/services/doom/rollDoomTick'
import { executeConfirmDoomTick } from './ConfirmDoomTick'
import { executeConfirmFactionTurn } from './ConfirmFactionTurn'
import { createClockAdvancedEvent } from '@domain/events/ClockAdvanced'
import { createWeatherRolledEvent } from '@domain/events/WeatherRolled'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IDoomRepository } from '@application/ports/IDoomRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import { advanceDay, advanceWatch, type WorldDateTime } from '@domain/value-objects/WorldDate'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
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
  worldId: string,
  unit: ClockAdvanceUnit,
  deps: AdvanceClockDeps
): Promise<AdvanceClockPreview | null> {
  const realm = await deps.realmRepo.getById(worldId)
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
    const recentWeather = await deps.weatherRepo.getRecent(worldId, 1)
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
      const factions = await deps.factionRepo.getByRealmId(worldId)
      const npcs = await deps.npcRepo.getByRealmId(worldId)
      const factionIds = factions.map((f) => f.id)
      const relationships = await deps.relationshipRepo.getAllForRealm(worldId, factionIds)

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
  poiEventRepo?: IPOIEventRepository
  /** Doom tick (optional — absent on pre-v45 realms; skip tick when missing). */
  doomRepo?: IDoomRepository
  connectionRepo?: IConnectionRepository
  poiRepo?: IPOIRepository
}

export interface AdvanceDayResult {
  previousDateTime: WorldDateTime
  newDateTime: WorldDateTime
  weather: WeatherResult
  factionTurns: FactionTurnSuggestion[]
  doomTick: DoomTickSuggestion | null
}

/**
 * Advance by 1 day, auto-roll weather, auto-apply faction turns. No confirmation needed.
 * For week advances, call this N times (once per day in the week).
 * Faction turns only fire when realm.factionTurnTrigger === 'day'.
 * For week-triggered faction turns, call executeFactionTurns separately after the loop.
 */
export async function executeAdvanceDay(
  worldId: string,
  deps: AdvanceDayDeps
): Promise<AdvanceDayResult | null> {
  const realm = await deps.realmRepo.getById(worldId)
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
  const recentWeather = await deps.weatherRepo.getRecent(worldId, 1)
  const previousSeverity = recentWeather.length > 0 ? recentWeather[0].severity : null
  const weather = rollWeather(newDateTime.season, previousSeverity, deps.rollDice)

  await deps.weatherRepo.create({
    id: newId(),
    worldId,
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
    factionTurns = await executeFactionTurns(worldId, newDateTime, deps)
  }

  // Doom tick — auto-applied when a looming doom exists. Absent on pre-v45
  // realms (no doomRepo provided) or when no doom is looming; safe to skip.
  let doomTick: DoomTickSuggestion | null = null
  if (deps.doomRepo && deps.connectionRepo && deps.poiRepo && deps.poiEventRepo) {
    const dooms = await deps.doomRepo.getByRealmId(worldId)
    const doom = dooms.find((d) => d.status === 'looming') ?? null
    if (doom) {
      const connections = await deps.connectionRepo.getByWorld(worldId)
      const pois = await deps.poiRepo.getByRealmId(worldId)
      const doomRng = new SeededRandom(
        `${worldId}:${newDateTime.year}:${newDateTime.season}:${newDateTime.day}`,
      )
      const suggestion = rollDoomTick(doom, { connections, pois }, doomRng)
      if (suggestion) {
        await executeConfirmDoomTick(worldId, doom, suggestion, newDateTime, {
          doomRepo: deps.doomRepo,
          connectionRepo: deps.connectionRepo,
          poiRepo: deps.poiRepo,
          poiEventRepo: deps.poiEventRepo,
          worldEventRepo: deps.worldEventRepo,
          eventBus: deps.eventBus,
        })
        doomTick = suggestion
      }
    }
  }

  // Activate/deactivate scheduled POI events by date window. A recurring
  // (year:null) event re-fires each year; a one-time event fires once. Logging
  // happens only on the inactive -> active transition.
  const poiEventRepo = deps.poiEventRepo
  if (poiEventRepo) {
    const allEvents = await poiEventRepo.getByRealmId(worldId)
    for (const evt of allEvents) {
      const shouldBeActive = isEventActiveOn(evt, newDateTime, realm.daysPerSeason, realm.watchesPerDay)
      if (shouldBeActive && !evt.isActive) {
        await poiEventRepo.update({ ...evt, isActive: true })
        await deps.worldEventRepo.create({
          id: newId(),
          worldId,
          year: newDateTime.year,
          season: newDateTime.season,
          day: newDateTime.day,
          watch: newDateTime.watch,
          type: 'poi_event',
          title: evt.name,
          description: evt.effects || evt.description,
          relatedEntityIds: [evt.id, evt.poiId],
          createdAt: Date.now(),
        })
      } else if (!shouldBeActive && evt.isActive) {
        await poiEventRepo.update({ ...evt, isActive: false })
      }
    }
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
  deps.eventBus.publish(createClockAdvancedEvent(worldId, 'day', current, newDateTime, []))
  deps.eventBus.publish(
    createWeatherRolledEvent(
      worldId, weather.condition, weather.severity,
      newDateTime.season, newDateTime.year, newDateTime.day, newDateTime.watch,
      weather.diceResult.rolls, weather.diceResult.total
    )
  )

  return { previousDateTime: current, newDateTime, weather, factionTurns, doomTick }
}

/**
 * Advance by 1 watch. Mid-day this just bumps the watch (no rolls). Crossing
 * the final watch of the day rolls into the next day with full day effects
 * (weather, faction turns, POI events) by delegating to executeAdvanceDay.
 * Returns the new datetime, or null if the realm is missing.
 */
export async function executeAdvanceWatch(
  worldId: string,
  deps: AdvanceDayDeps
): Promise<WorldDateTime | null> {
  const realm = await deps.realmRepo.getById(worldId)
  if (!realm) return null

  // Final watch of the day → roll over into the next day with full effects.
  if (realm.currentWatch >= realm.watchesPerDay) {
    const result = await executeAdvanceDay(worldId, deps)
    return result?.newDateTime ?? null
  }

  const current: WorldDateTime = {
    year: realm.currentYear,
    season: realm.currentSeason,
    day: realm.currentDay,
    watch: realm.currentWatch,
  }
  const newDateTime = advanceWatch(current, realm.daysPerSeason, realm.watchesPerDay)

  await deps.realmRepo.update({
    ...realm,
    currentWatch: newDateTime.watch,
    updatedAt: Date.now(),
  })

  deps.eventBus.publish(createClockAdvancedEvent(worldId, 'watch', current, newDateTime, []))

  return newDateTime
}

/** Roll + apply faction turns for the current date. Used for week-triggered turns. */
export async function executeFactionTurns(
  worldId: string,
  dt: WorldDateTime,
  deps: AdvanceDayDeps
): Promise<FactionTurnSuggestion[]> {
  const factions = await deps.factionRepo.getByRealmId(worldId)
  const npcs = await deps.npcRepo.getByRealmId(worldId)
  const factionIds = factions.map((f) => f.id)
  const relationships = await deps.relationshipRepo.getAllForRealm(worldId, factionIds)

  const suggestions = rollAllFactionTurns(factions, npcs, relationships, deps.rollDice)

  // Auto-apply all faction turns (no GM confirmation)
  await executeConfirmFactionTurn(worldId, suggestions, dt, {
    factionRepo: deps.factionRepo,
    relationshipRepo: deps.relationshipRepo,
    worldEventRepo: deps.worldEventRepo,
    eventBus: deps.eventBus,
  })

  return suggestions
}
