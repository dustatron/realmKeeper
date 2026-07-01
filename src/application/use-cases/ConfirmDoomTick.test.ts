import { describe, it, expect, beforeEach } from 'vitest'
import { executeConfirmDoomTick, type ConfirmDoomTickDeps } from './ConfirmDoomTick'
import type { Doom } from '@domain/entities/Doom'
import type { Connection } from '@domain/entities/Connection'
import type { POI } from '@domain/entities/POI'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { DoomTickSuggestion } from '@domain/services/doom/rollDoomTick'
import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

// ── In-memory fakes ──────────────────────────────────────────────────────────

function makeFakeDoomRepo(initial: Doom) {
  let stored = { ...initial }
  return {
    getById: async (id: string) => (stored.id === id ? { ...stored } : undefined),
    getByRealmId: async () => [{ ...stored }],
    create: async (d: Doom) => { stored = { ...d } },
    update: async (d: Doom) => { stored = { ...d } },
    delete: async () => {},
    _get: () => stored,
  }
}

function makeFakeConnectionRepo(connections: Connection[]) {
  const store = [...connections]
  return {
    getByEntity: async () => [],
    getByWorld: async () => [...store],
    getByHook: async () => [],
    create: async () => {},
    bulkCreate: async () => {},
    update: async () => {},
    delete: async (id: string) => {
      const idx = store.findIndex((c) => c.id === id)
      if (idx >= 0) store.splice(idx, 1)
    },
    _store: store,
  }
}

function makeFakePOIRepo(pois: POI[]) {
  const store: POI[] = pois.map((p) => ({ ...p }))
  return {
    getById: async (id: string) => store.find((p) => p.id === id),
    getByRegionId: async () => [],
    getByParentPoiId: async () => [],
    getChildren: async () => [],
    create: async (p: POI) => { store.push({ ...p }) },
    update: async (p: POI) => {
      const idx = store.findIndex((x) => x.id === p.id)
      if (idx >= 0) store[idx] = { ...p }
    },
    delete: async () => {},
    _store: store,
  }
}

function makeFakePOIEventRepo() {
  const store: POIEvent[] = []
  return {
    getById: async (id: string) => store.find((e) => e.id === id),
    getByPoiId: async () => [],
    getByRealmId: async () => [],
    getActive: async () => [],
    create: async (e: POIEvent) => { store.push({ ...e }) },
    update: async () => {},
    delete: async () => {},
    _store: store,
  }
}

function makeFakeWorldEventRepo() {
  const store: WorldEvent[] = []
  return {
    getById: async (id: string) => store.find((e) => e.id === id),
    getByRealmId: async () => [],
    getByDate: async () => [],
    getRecent: async () => [],
    create: async (e: WorldEvent) => { store.push({ ...e }) },
    delete: async () => {},
    _store: store,
  }
}

function makeFakeEventBus() {
  const published: Array<{ type: string; payload: Record<string, unknown> }> = []
  return {
    publish: (e: { type: string; payload: Record<string, unknown>; timestamp: number }) => {
      published.push({ type: e.type, payload: e.payload })
    },
    subscribe: () => () => {},
    _published: published,
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const WORLD_ID = 'world-1'

const baseDoom: Doom = {
  id: 'doom-1',
  worldId: WORLD_ID,
  name: 'The Creeping Dark',
  theme: '',
  description: '',
  doomFactionId: null,
  status: 'looming',
  progress: 1,
  segments: 6,
  stages: [
    { threshold: 2, portent: 'First portent', fired: false },
    { threshold: 4, portent: 'Second portent', fired: false },
  ],
  vector: 'roads',
  keyedResource: null,
  keyedBiome: null,
  reckoningDate: { year: 1, season: 'spring', day: 1, watch: 1 },
  hookId: null,
  createdAt: 0,
  updatedAt: 0,
}

const supplyConn: Connection = {
  id: 'conn-trade-1',
  worldId: WORLD_ID,
  fromType: 'poi',
  fromId: 'poi-a',
  toType: 'poi',
  toId: 'poi-b',
  kind: 'supplies',
  label: '',
  status: 'active',
  hookId: null,
  createdAt: 0,
  updatedAt: 0,
}

const waterNeedPoi = buildPOI({
  regionId: 'r1',
  name: 'Mill Town',
  type: 'settlement',
  trade: { produces: 'flour', needs: ['grain'] },
})

const waterProducePoi = buildPOI({
  regionId: 'r1',
  name: 'Spring Village',
  type: 'settlement',
  trade: { produces: 'water', needs: ['fish'] },
})

const tradePoi = buildPOI({
  regionId: 'r1',
  name: 'Iron Hold',
  type: 'settlement',
  trade: { produces: 'iron', needs: ['food'] },
})

const dt: WorldDateTime = { year: 1, season: 'spring', day: 5, watch: 2 }

function makeDeps(overrides: Partial<{
  doom: Doom
  connections: Connection[]
  pois: POI[]
}> = {}): ConfirmDoomTickDeps & {
  _doomRepo: ReturnType<typeof makeFakeDoomRepo>
  _connRepo: ReturnType<typeof makeFakeConnectionRepo>
  _poiRepo: ReturnType<typeof makeFakePOIRepo>
  _poiEventRepo: ReturnType<typeof makeFakePOIEventRepo>
  _worldEventRepo: ReturnType<typeof makeFakeWorldEventRepo>
  _eventBus: ReturnType<typeof makeFakeEventBus>
} {
  const doomRepo = makeFakeDoomRepo(overrides.doom ?? baseDoom)
  const connRepo = makeFakeConnectionRepo(overrides.connections ?? [])
  const poiRepo = makeFakePOIRepo(overrides.pois ?? [])
  const poiEventRepo = makeFakePOIEventRepo()
  const worldEventRepo = makeFakeWorldEventRepo()
  const eventBus = makeFakeEventBus()

  return {
    doomRepo,
    connectionRepo: connRepo,
    poiRepo,
    poiEventRepo,
    worldEventRepo,
    eventBus,
    _doomRepo: doomRepo,
    _connRepo: connRepo,
    _poiRepo: poiRepo,
    _poiEventRepo: poiEventRepo,
    _worldEventRepo: worldEventRepo,
    _eventBus: eventBus,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('executeConfirmDoomTick — cut_trade', () => {
  it('deletes exactly the named connection', async () => {
    const deps = makeDeps({ connections: [supplyConn] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'First portent', fired: false }],
      effects: [{ kind: 'cut_trade', targetId: 'conn-trade-1', description: 'Trade route severed.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._connRepo._store).toHaveLength(0)
  })
})

describe('executeConfirmDoomTick — foul_water', () => {
  it('adds water to needs when POI does not produce water', async () => {
    const poi = { ...waterNeedPoi } // produces 'flour', needs ['grain']
    const deps = makeDeps({ pois: [poi] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'foul_water', targetId: poi.id, description: 'Water fouled.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    const updated = deps._poiRepo._store.find((p) => p.id === poi.id)
    expect(updated?.trade?.needs).toContain('water')
    expect(updated?.trade?.needs).toContain('grain') // original need preserved
  })

  it('does not duplicate water in needs if already present', async () => {
    const poi = buildPOI({
      regionId: 'r1',
      name: 'Thirsty Town',
      type: 'settlement',
      trade: { produces: 'coal', needs: ['water', 'food'] },
    })
    const deps = makeDeps({ pois: [poi] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'foul_water', targetId: poi.id, description: 'Water fouled.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    const updated = deps._poiRepo._store.find((p) => p.id === poi.id)
    const waterCount = updated?.trade?.needs.filter((n) => n === 'water').length ?? 0
    expect(waterCount).toBe(1)
  })

  it('clears produces when POI produces water', async () => {
    const poi = { ...waterProducePoi }
    const deps = makeDeps({ pois: [poi] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'foul_water', targetId: poi.id, description: 'Water fouled.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    const updated = deps._poiRepo._store.find((p) => p.id === poi.id)
    expect(updated?.trade?.produces).toBe('')
  })

  it('skips gracefully when POI not found', async () => {
    const deps = makeDeps({ pois: [] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'foul_water', targetId: 'missing-poi', description: 'Water fouled.' }],
      reckoned: false,
    }

    await expect(
      executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps),
    ).resolves.not.toThrow()
  })

  it('skips gracefully when POI has no trade', async () => {
    const noTrade = buildPOI({ regionId: 'r1', name: 'Cave', type: 'dungeon', trade: null })
    const deps = makeDeps({ pois: [noTrade] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'foul_water', targetId: noTrade.id, description: 'Water fouled.' }],
      reckoned: false,
    }

    await expect(
      executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps),
    ).resolves.not.toThrow()
  })
})

describe('executeConfirmDoomTick — spawn_problem', () => {
  it('creates a POIEvent with type disaster, tags doom, correct poiId and trigger', async () => {
    const deps = makeDeps({ pois: [tradePoi] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'spawn_problem', targetId: tradePoi.id, description: 'Iron blight.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._poiEventRepo._store).toHaveLength(1)
    const evt = deps._poiEventRepo._store[0]
    expect(evt.type).toBe('disaster')
    expect(evt.tags).toContain('doom')
    expect(evt.poiId).toBe(tradePoi.id)
    expect(evt.worldId).toBe(WORLD_ID)
    expect(evt.trigger.year).toBe(dt.year)
    expect(evt.trigger.season).toBe(dt.season)
    expect(evt.trigger.day).toBe(dt.day)
    expect(evt.trigger.watch).toBe(dt.watch)
    expect(evt.isActive).toBe(true)
    expect(evt.recurring).toBe(false)
  })
})

describe('executeConfirmDoomTick — doom entity update', () => {
  it('marks fired stages as fired=true', async () => {
    const deps = makeDeps()
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'First portent', fired: false }],
      effects: [],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    const updated = deps._doomRepo._get()
    expect(updated.stages.find((s) => s.threshold === 2)?.fired).toBe(true)
    expect(updated.stages.find((s) => s.threshold === 4)?.fired).toBe(false)
  })

  it('sets progress to newProgress', async () => {
    const deps = makeDeps()
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [],
      effects: [],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._doomRepo._get().progress).toBe(2)
  })

  it('keeps status looming when reckoned=false', async () => {
    const deps = makeDeps()
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [],
      effects: [],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._doomRepo._get().status).toBe('looming')
  })

  it('sets status to reckoned when reckoned=true', async () => {
    const deps = makeDeps()
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 5,
      newProgress: 6,
      firedStages: [],
      effects: [],
      reckoned: true,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._doomRepo._get().status).toBe('reckoned')
  })
})

describe('executeConfirmDoomTick — WorldEvent per fired stage', () => {
  it('creates one doom_stage WorldEvent per fired stage', async () => {
    const deps = makeDeps({ connections: [supplyConn] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'First portent', fired: false }],
      effects: [{ kind: 'cut_trade', targetId: 'conn-trade-1', description: 'Trade severed.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._worldEventRepo._store).toHaveLength(1)
    const evt = deps._worldEventRepo._store[0]
    expect(evt.type).toBe('doom_stage')
    expect(evt.worldId).toBe(WORLD_ID)
    expect(evt.year).toBe(dt.year)
    expect(evt.season).toBe(dt.season)
    expect(evt.day).toBe(dt.day)
    expect(evt.watch).toBe(dt.watch)
  })

  it('WorldEvent relatedEntityIds includes doom.id', async () => {
    const deps = makeDeps()
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    const evt = deps._worldEventRepo._store[0]
    expect(evt.relatedEntityIds).toContain('doom-1')
  })

  it('WorldEvent relatedEntityIds includes effect targetId when effect exists', async () => {
    const deps = makeDeps({ connections: [supplyConn] })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 1,
      newProgress: 2,
      firedStages: [{ threshold: 2, portent: 'P', fired: false }],
      effects: [{ kind: 'cut_trade', targetId: 'conn-trade-1', description: 'Trade severed.' }],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    const evt = deps._worldEventRepo._store[0]
    expect(evt.relatedEntityIds).toContain('conn-trade-1')
  })

  it('creates no WorldEvent when no stages fired', async () => {
    const deps = makeDeps()
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 0,
      newProgress: 1,
      firedStages: [],
      effects: [],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, baseDoom, suggestion, dt, deps)

    expect(deps._worldEventRepo._store).toHaveLength(0)
  })

  it('creates two WorldEvents when two stages fire', async () => {
    // Two stages at threshold 1 and 2, advancing from progress 0 → 1 crosses only one
    // To fire two, we need two stages with threshold ≤ newProgress
    // Use a doom with two stages at threshold 1 and 2, advance from 0→1 fires threshold=1 only
    // Instead, use a doom with stages at threshold 2 and 3, progress=1, newProgress=3 impossible (only +1)
    // Workaround: set stages both at threshold 1, progress 0 → 1
    const doom2: Doom = {
      ...baseDoom,
      progress: 0,
      stages: [
        { threshold: 1, portent: 'Alpha', fired: false },
        { threshold: 1, portent: 'Beta', fired: false },
      ],
    }
    const deps = makeDeps({ doom: doom2 })
    const suggestion: DoomTickSuggestion = {
      doomId: 'doom-1',
      previousProgress: 0,
      newProgress: 1,
      firedStages: [
        { threshold: 1, portent: 'Alpha', fired: false },
        { threshold: 1, portent: 'Beta', fired: false },
      ],
      effects: [],
      reckoned: false,
    }

    await executeConfirmDoomTick(WORLD_ID, doom2, suggestion, dt, deps)

    expect(deps._worldEventRepo._store).toHaveLength(2)
  })
})
