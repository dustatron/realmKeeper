import { describe, it, expect } from 'vitest'
import { rollDoomTick } from './rollDoomTick'
import type { DoomGraph } from './rollDoomTick'
import type { Doom, DoomVector } from '@domain/entities/Doom'
import type { Connection } from '@domain/entities/Connection'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'

// ── fixtures ────────────────────────────────────────────────────────────────

const baseDoom: Doom = {
  id: 'doom-1',
  worldId: 'world-1',
  name: 'The Creeping Dark',
  theme: '',
  description: 'A shadow spreads',
  doomFactionId: null,
  status: 'looming',
  progress: 0,
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
  id: 'conn-1',
  worldId: 'world-1',
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

const nonSupplyConn: Connection = {
  ...supplyConn,
  id: 'conn-ally',
  kind: 'ally',
}

const waterNeedPoi = buildPOI({
  regionId: 'r1',
  name: 'Mill Town',
  type: 'settlement',
  trade: { produces: 'flour', needs: ['water', 'wheat'] },
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

const noTradePoi = buildPOI({
  regionId: 'r1',
  name: 'The Wild Cave',
  type: 'dungeon',
  trade: null,
})

// ── helpers ─────────────────────────────────────────────────────────────────

const emptyGraph: DoomGraph = { connections: [], pois: [] }

function rng(seed = 42): SeededRandom {
  return new SeededRandom(seed)
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('rollDoomTick — status guard', () => {
  it('returns null when status is averted', () => {
    expect(rollDoomTick({ ...baseDoom, status: 'averted' }, emptyGraph, rng())).toBeNull()
  })

  it('returns null when status is reckoned', () => {
    expect(rollDoomTick({ ...baseDoom, status: 'reckoned' }, emptyGraph, rng())).toBeNull()
  })
})

describe('rollDoomTick — progress advancement', () => {
  it('advances progress by 1 from 0', () => {
    const result = rollDoomTick(baseDoom, emptyGraph, rng())
    expect(result?.previousProgress).toBe(0)
    expect(result?.newProgress).toBe(1)
  })

  it('does not exceed segments', () => {
    const doom = { ...baseDoom, progress: 6, segments: 6 }
    const result = rollDoomTick(doom, emptyGraph, rng())
    expect(result?.newProgress).toBe(6)
  })

  it('no stage crossed → empty firedStages and effects, progress still advances', () => {
    // progress 0 → 1; thresholds are 2 and 4, neither crossed
    const result = rollDoomTick(baseDoom, { connections: [supplyConn], pois: [] }, rng())
    expect(result?.firedStages).toHaveLength(0)
    expect(result?.effects).toHaveLength(0)
    expect(result?.newProgress).toBe(1)
  })

  it('reckoned=false before reaching segments', () => {
    const result = rollDoomTick({ ...baseDoom, progress: 4 }, emptyGraph, rng())
    expect(result?.reckoned).toBe(false)
  })

  it('reckoned=true when progress reaches segments', () => {
    const doom = { ...baseDoom, progress: 5, segments: 6 }
    const result = rollDoomTick(doom, emptyGraph, rng())
    expect(result?.reckoned).toBe(true)
    expect(result?.newProgress).toBe(6)
  })
})

describe('rollDoomTick — stage firing', () => {
  it('fires a stage whose threshold is crossed', () => {
    // progress 1 → 2; threshold 2 is crossed
    const doom = { ...baseDoom, progress: 1 }
    const result = rollDoomTick(doom, emptyGraph, rng())
    expect(result?.firedStages).toHaveLength(1)
    expect(result?.firedStages[0].threshold).toBe(2)
    expect(result?.firedStages[0].portent).toBe('First portent')
  })

  it('does not re-fire an already fired stage', () => {
    const doom = {
      ...baseDoom,
      progress: 1,
      stages: [
        { threshold: 2, portent: 'P1', fired: true },
        { threshold: 4, portent: 'P2', fired: false },
      ],
    }
    const result = rollDoomTick(doom, emptyGraph, rng())
    expect(result?.firedStages).toHaveLength(0)
  })

  it('does not fire a stage whose threshold is above newProgress', () => {
    // progress 0 → 1; threshold 2 is not yet reached
    const doom = {
      ...baseDoom,
      stages: [{ threshold: 2, portent: 'P', fired: false }],
    }
    const result = rollDoomTick(doom, emptyGraph, rng())
    expect(result?.firedStages).toHaveLength(0)
  })
})

describe('rollDoomTick — roads vector', () => {
  it('produces a cut_trade effect for a supplies connection', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'roads' as DoomVector }
    const result = rollDoomTick(doom, { connections: [supplyConn], pois: [] }, rng())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0].kind).toBe('cut_trade')
    expect(result?.effects[0].targetId).toBe('conn-1')
    expect(result?.effects[0].description).toBeTruthy()
  })

  it('skips non-supplies connections', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'roads' as DoomVector }
    const result = rollDoomTick(doom, { connections: [nonSupplyConn], pois: [] }, rng())
    expect(result?.effects).toHaveLength(0)
  })

  it('produces no effect when no supplies connections exist', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'roads' as DoomVector }
    const result = rollDoomTick(doom, emptyGraph, rng())
    expect(result?.firedStages).toHaveLength(1)
    expect(result?.effects).toHaveLength(0)
  })

  it('ignores connections from a different worldId', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'roads' as DoomVector }
    const otherWorldConn: Connection = { ...supplyConn, worldId: 'other-world' }
    const result = rollDoomTick(doom, { connections: [otherWorldConn], pois: [] }, rng())
    expect(result?.effects).toHaveLength(0)
  })
})

describe('rollDoomTick — water vector', () => {
  it('fouls a POI that needs water', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'water' as DoomVector }
    const result = rollDoomTick(doom, { connections: [], pois: [waterNeedPoi] }, rng())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0].kind).toBe('foul_water')
    expect(result?.effects[0].targetId).toBe(waterNeedPoi.id)
  })

  it('fouls a POI that produces water', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'water' as DoomVector }
    const result = rollDoomTick(doom, { connections: [], pois: [waterProducePoi] }, rng())
    expect(result?.effects[0].kind).toBe('foul_water')
    expect(result?.effects[0].targetId).toBe(waterProducePoi.id)
  })

  it('produces no effect when no water-related POIs exist', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'water' as DoomVector }
    const result = rollDoomTick(doom, { connections: [], pois: [tradePoi] }, rng())
    expect(result?.effects).toHaveLength(0)
  })

  it('ignores POIs with no trade', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'water' as DoomVector }
    const result = rollDoomTick(doom, { connections: [], pois: [noTradePoi] }, rng())
    expect(result?.effects).toHaveLength(0)
  })
})

describe('rollDoomTick — blight vector', () => {
  it('spawns a problem on a trade POI', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'blight' as DoomVector, keyedBiome: 'forest' }
    const result = rollDoomTick(doom, { connections: [], pois: [tradePoi] }, rng())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0].kind).toBe('spawn_problem')
    expect(result?.effects[0].targetId).toBe(tradePoi.id)
  })

  it('produces no effect when no trade POIs exist', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'blight' as DoomVector }
    const result = rollDoomTick(doom, { connections: [], pois: [noTradePoi] }, rng())
    expect(result?.effects).toHaveLength(0)
  })
})

describe('rollDoomTick — resource vector', () => {
  it('spawns a problem on a trade POI, themed by keyedResource', () => {
    const doom = {
      ...baseDoom,
      progress: 1,
      vector: 'resource' as DoomVector,
      keyedResource: 'iron',
    }
    const result = rollDoomTick(doom, { connections: [], pois: [tradePoi] }, rng())
    expect(result?.effects[0].kind).toBe('spawn_problem')
    expect(result?.effects[0].description).toContain('iron')
  })
})

describe('rollDoomTick — determinism', () => {
  it('is deterministic under fixed seed', () => {
    const doom = { ...baseDoom, progress: 1, vector: 'roads' as DoomVector }
    const graph: DoomGraph = { connections: [supplyConn], pois: [] }
    const r1 = rollDoomTick(doom, graph, new SeededRandom(42))
    const r2 = rollDoomTick(doom, graph, new SeededRandom(42))
    expect(r1?.effects[0].targetId).toBe(r2?.effects[0].targetId)
  })

  it('different seeds can yield different results with multiple targets', () => {
    const conn2: Connection = { ...supplyConn, id: 'conn-2' }
    const doom = { ...baseDoom, progress: 1, vector: 'roads' as DoomVector }
    const graph: DoomGraph = { connections: [supplyConn, conn2], pois: [] }
    const results = new Set<string>()
    for (let s = 0; s < 20; s++) {
      const r = rollDoomTick(doom, graph, new SeededRandom(s))
      if (r?.effects[0]) results.add(r.effects[0].targetId)
    }
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('rollDoomTick — effect count matches fired-stage count when targets exist', () => {
  it('one fired stage + one target → one effect', () => {
    const doom = {
      ...baseDoom,
      progress: 0,
      stages: [{ threshold: 1, portent: 'P1', fired: false }],
      vector: 'roads' as DoomVector,
    }
    const result = rollDoomTick(doom, { connections: [supplyConn], pois: [] }, rng())
    expect(result?.firedStages).toHaveLength(1)
    expect(result?.effects).toHaveLength(1)
  })
})
