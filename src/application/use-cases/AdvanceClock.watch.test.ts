import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeAdvanceWatch } from './AdvanceClock'
import { newId } from '@shared/ulid'
import { rollDice } from '@shared/dice'
import type { Realm } from '@domain/entities/Realm'

const container = createContainer()
beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.filter((t) => t.name !== 'systemConfigs').map((t) => t.clear()))
})

const realm = (over: Partial<Realm> = {}): Realm => ({
  id: newId(), name: 'R', systemId: 'system-cairn-2e', description: '',
  currentYear: 1, currentSeason: 'summer', currentDay: 9, currentWatch: 1,
  daysPerSeason: 30, daysPerWeek: 7, watchesPerDay: 3, factionTurnTrigger: 'manual',
  completedThroughDay: 0, customRaces: [], raceColors: {}, starredMonsterIds: [],
  starredSpellIds: [], starredMagicItemIds: [], hiddenCompendiumIds: [],
  createdAt: 0, updatedAt: 0, ...over,
})

const deps = () => ({
  realmRepo: container.realmRepo, weatherRepo: container.weatherRepo,
  factionRepo: container.factionRepo, relationshipRepo: container.factionRelationshipRepo,
  npcRepo: container.npcRepo, worldEventRepo: container.worldEventRepo,
  eventBus: container.eventBus, rollDice,
  poiEventRepo: container.poiEventRepo,
})

describe('executeAdvanceWatch', () => {
  it('mid-day: bumps the watch without changing the day or rolling weather', async () => {
    const r = realm({ currentDay: 9, currentWatch: 1 })
    await container.realmRepo.create(r)

    const result = await executeAdvanceWatch(r.id, deps())

    expect(result).toEqual({ year: 1, season: 'summer', day: 9, watch: 2 })
    const saved = await container.realmRepo.getById(r.id)
    expect(saved?.currentDay).toBe(9)
    expect(saved?.currentWatch).toBe(2)
    // No day rollover → no weather should have been rolled.
    const weather = await db.weatherHistory.where('worldId').equals(r.id).toArray()
    expect(weather.length).toBe(0)
  })

  it('final watch: rolls into the next day, resets watch, and rolls weather', async () => {
    const r = realm({ currentDay: 9, currentWatch: 3 }) // watchesPerDay = 3
    await container.realmRepo.create(r)

    const result = await executeAdvanceWatch(r.id, deps())

    expect(result).toEqual({ year: 1, season: 'summer', day: 10, watch: 1 })
    const saved = await container.realmRepo.getById(r.id)
    expect(saved?.currentDay).toBe(10)
    expect(saved?.currentWatch).toBe(1)
    // Day advanced → exactly one weather row persisted for the new day.
    const weather = await db.weatherHistory.where('worldId').equals(r.id).toArray()
    expect(weather.length).toBe(1)
    expect(weather[0].day).toBe(10)
  })

  it('returns null when the realm does not exist', async () => {
    expect(await executeAdvanceWatch('missing', deps())).toBeNull()
  })
})
