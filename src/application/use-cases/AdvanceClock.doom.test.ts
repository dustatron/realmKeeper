import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeAdvanceDay } from './AdvanceClock'
import { newId } from '@shared/ulid'
import { rollDice } from '@shared/dice'
import type { Realm } from '@domain/entities/Realm'
import type { Doom } from '@domain/entities/Doom'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.filter((t) => t.name !== 'systemConfigs').map((t) => t.clear()))
})

const realm = (over: Partial<Realm> = {}): Realm => ({
  id: newId(), name: 'R', systemId: 'system-cairn-2e', description: '',
  currentYear: 1, currentSeason: 'summer', currentDay: 9, currentWatch: 1,
  daysPerSeason: 30, daysPerWeek: 7, watchesPerDay: 3, moonCycleLength: 28,
  factionTurnTrigger: 'manual',
  completedThroughDay: 0, customRaces: [], raceColors: {}, starredMonsterIds: [],
  starredSpellIds: [], starredMagicItemIds: [], hiddenCompendiumIds: [],
  createdAt: 0, updatedAt: 0, ...over,
})

const loomingDoom = (worldId: string, over: Partial<Doom> = {}): Doom => ({
  id: newId(),
  worldId,
  name: 'The Salt-Death',
  theme: '',
  description: 'A doom approaches.',
  doomFactionId: null,
  status: 'looming',
  progress: 0,
  segments: 6,
  stages: [
    { threshold: 2, portent: 'The first portent fires.', fired: false },
    { threshold: 4, portent: 'The second portent fires.', fired: false },
    { threshold: 6, portent: 'Reckoning.', fired: false },
  ],
  vector: 'roads',
  keyedResource: null,
  keyedBiome: null,
  reckoningDate: { year: 2, season: 'winter', day: 10, watch: 1 },
  hookId: null,
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

const deps = () => ({
  realmRepo: container.realmRepo,
  weatherRepo: container.weatherRepo,
  factionRepo: container.factionRepo,
  relationshipRepo: container.factionRelationshipRepo,
  npcRepo: container.npcRepo,
  worldEventRepo: container.worldEventRepo,
  eventBus: container.eventBus,
  rollDice,
  poiEventRepo: container.poiEventRepo,
  doomRepo: container.doomRepo,
  connectionRepo: container.connectionRepo,
  poiRepo: container.poiRepo,
})

describe('executeAdvanceDay doom tick (D2)', () => {
  it('advances doom progress by 1 each day when a looming doom exists', async () => {
    const r = realm()
    await container.realmRepo.create(r)
    const doom = loomingDoom(r.id)
    await container.doomRepo.create(doom)

    const result = await executeAdvanceDay(r.id, deps())
    expect(result).not.toBeNull()

    const saved = await container.doomRepo.getById(doom.id)
    expect(saved?.progress).toBe(1)
    expect(saved?.status).toBe('looming')
    expect(result?.doomTick).not.toBeNull()
    expect(result?.doomTick?.newProgress).toBe(1)
  })

  it('does not tick when no doom exists (pre-v45 realm, no doom)', async () => {
    const r = realm()
    await container.realmRepo.create(r)

    const result = await executeAdvanceDay(r.id, deps())
    expect(result).not.toBeNull()
    expect(result?.doomTick).toBeNull()
  })

  it('does not tick a reckoned doom', async () => {
    const r = realm()
    await container.realmRepo.create(r)
    const doom = loomingDoom(r.id, { status: 'reckoned', progress: 6 })
    await container.doomRepo.create(doom)

    const result = await executeAdvanceDay(r.id, deps())
    expect(result?.doomTick).toBeNull()

    const saved = await container.doomRepo.getById(doom.id)
    expect(saved?.progress).toBe(6) // unchanged
  })

  it('fires a doom_stage WorldEvent when a stage threshold is crossed', async () => {
    const r = realm()
    await container.realmRepo.create(r)
    // Set progress to 1 so stage at threshold 2 fires on next advance
    const doom = loomingDoom(r.id, { progress: 1 })
    await container.doomRepo.create(doom)

    await executeAdvanceDay(r.id, deps())

    const events = await db.worldEvents.where('worldId').equals(r.id).toArray()
    const doomStageEvents = events.filter((e) => e.type === 'doom_stage')
    expect(doomStageEvents.length).toBeGreaterThanOrEqual(1)
    expect(doomStageEvents[0].relatedEntityIds).toContain(doom.id)
  })

  it('still advances day without error when doomRepo is not provided (backward compat)', async () => {
    const r = realm()
    await container.realmRepo.create(r)
    const doom = loomingDoom(r.id)
    await container.doomRepo.create(doom)

    // Deps without doomRepo — should not crash
    const d = deps()
    const { doomRepo: _, connectionRepo: __, poiRepo: ___, ...noDoomDeps } = d
    const result = await executeAdvanceDay(r.id, noDoomDeps)
    expect(result).not.toBeNull()
    expect(result?.doomTick).toBeNull()
  })
})
