import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeAdvanceDay } from './AdvanceClock'
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

const civicEvent = (worldId: string, isActive: boolean) => ({
  id: newId(), poiId: 'p1', worldId, name: 'Festival', description: 'd',
  type: 'festival' as const, trigger: { year: null, season: 'summer' as const, day: 10, watch: null },
  recurring: true, durationWatches: 3, isActive, effects: '', tags: ['civic'],
  createdAt: 0, updatedAt: 0,
})

describe('executeAdvanceDay POIEvent activation', () => {
  it('activates a recurring civic event on its day and logs a WorldEvent', async () => {
    const r = realm()
    await container.realmRepo.create(r)
    await container.poiEventRepo.create(civicEvent(r.id, false))
    await executeAdvanceDay(r.id, deps()) // day 9 -> 10

    const evts = await container.poiEventRepo.getByRealmId(r.id)
    expect(evts[0].isActive).toBe(true)
    const logged = await db.worldEvents.where('worldId').equals(r.id).toArray()
    expect(logged.some((e) => e.type === 'poi_event' && e.title === 'Festival')).toBe(true)
  })

  it('deactivates the event once its day has passed', async () => {
    const r = realm({ currentDay: 10 })
    await container.realmRepo.create(r)
    await container.poiEventRepo.create(civicEvent(r.id, true))
    await executeAdvanceDay(r.id, deps()) // day 10 -> 11

    const evts = await container.poiEventRepo.getByRealmId(r.id)
    expect(evts[0].isActive).toBe(false)
  })
})
