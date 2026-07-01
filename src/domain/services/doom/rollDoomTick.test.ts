import { describe, it, expect } from 'vitest'
import { rollDoomTick } from './rollDoomTick'
import type { DoomGraph } from './rollDoomTick'
import type { Doom, DoomStage, DoomVector } from '@domain/entities/Doom'
import type { Connection } from '@domain/entities/Connection'
import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'

// ── constants ─────────────────────────────────────────────────────────────────

/** daysPerSeason used in all unit tests — large enough that days 1–90 are all spring year 1. */
const DPS = 90

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a WorldDateTime at the given day of spring year 1. */
function mkDt(day: number): WorldDateTime {
  return { year: 1, season: 'spring', day, watch: 1 }
}

/**
 * Build a minimal Doom for unit-testing the proportional clock.
 * startDay and reckonDay are day-numbers in spring year 1 with DPS=90.
 * All other fields default to sensible values.
 */
function mkDoom(opts: {
  segments?: number
  startDay: number
  reckonDay: number
  progress?: number
  status?: Doom['status']
  stages?: DoomStage[]
  vector?: DoomVector
  keyedResource?: string | null
  keyedBiome?: string | null
}): Doom {
  return {
    id: 'doom-1',
    worldId: 'world-1',
    name: 'The Creeping Dark',
    theme: '',
    description: 'A shadow spreads',
    doomFactionId: null,
    status: opts.status ?? 'looming',
    progress: opts.progress ?? 0,
    segments: opts.segments ?? 6,
    stages: opts.stages ?? [
      { threshold: 2, portent: 'First portent', fired: false },
      { threshold: 4, portent: 'Second portent', fired: false },
    ],
    vector: opts.vector ?? 'roads',
    keyedResource: opts.keyedResource ?? null,
    keyedBiome: opts.keyedBiome ?? null,
    startDate: { year: 1, season: 'spring', day: opts.startDay, watch: 1 },
    reckoningDate: { year: 1, season: 'spring', day: opts.reckonDay, watch: 1 },
    hookId: null,
    createdAt: 0,
    updatedAt: 0,
  }
}

/** Standard doom for tests: start day 1, reckoning day 61. Total = 60 days.
 *  With segments=6 and DPS=90: target = round(6 * elapsed / 60).
 *  Breakpoints (exact): day 11 → 1, day 21 → 2, day 31 → 3, day 41 → 4, day 51 → 5, day 61+ → 6.
 */
const baseDoom = mkDoom({ startDay: 1, reckonDay: 61 })

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

const emptyGraph: DoomGraph = { connections: [], pois: [] }

function rng(seed: number | string = 42): SeededRandom {
  return new SeededRandom(seed)
}

// ── proportional clock fill ───────────────────────────────────────────────────

describe('rollDoomTick — proportional progress fill', () => {
  it('at dt=startDate (elapsed=0) returns null — no advance from 0', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 0 })
    expect(rollDoomTick(doom, emptyGraph, mkDt(1), DPS, rng())).toBeNull()
  })

  it('at 1/3 of the span, progress fills to 2 of 6', () => {
    // elapsed = 20/60, target = round(6 * 20/60) = 2
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 0 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())
    expect(result?.newProgress).toBe(2)
  })

  it('at or past reckoningDate, progress reaches segments and reckoned=true', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 0 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(61), DPS, rng())
    expect(result?.newProgress).toBe(6)
    expect(result?.reckoned).toBe(true)
  })

  it('beyond reckoningDate, progress is clamped to segments', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 0 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(71), DPS, rng())
    expect(result?.newProgress).toBe(6)
  })

  it('dt that does not advance progress past doom.progress returns null', () => {
    // doom.progress=2; at day 21 target=2 → no advance
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 2 })
    expect(rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())).toBeNull()
  })

  it('monotonic — progress never rewinds (doom.progress=4, target=2) returns null', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 4 })
    expect(rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())).toBeNull()
  })

  it('previousProgress and newProgress are reported correctly', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 0 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())
    expect(result?.previousProgress).toBe(0)
    expect(result?.newProgress).toBe(2)
  })

  it('totalDays<=0 (startDate === reckoningDate) fills to segments immediately', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 1, progress: 0 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(1), DPS, rng())
    // total=0 → target=segments=6, newProgress=6>0
    expect(result?.newProgress).toBe(6)
    expect(result?.reckoned).toBe(true)
  })
})

// ── status guard ──────────────────────────────────────────────────────────────

describe('rollDoomTick — status guard', () => {
  it('returns null when status is averted', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, status: 'averted' })
    expect(rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())).toBeNull()
  })

  it('returns null when status is reckoned', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, status: 'reckoned' })
    expect(rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())).toBeNull()
  })
})

// ── progress advancement ──────────────────────────────────────────────────────

describe('rollDoomTick — progress advancement', () => {
  it('advances progress proportionally from 0', () => {
    // dt at 1/6 of span: elapsed=10/60, target=round(6*10/60)=1
    const result = rollDoomTick(baseDoom, emptyGraph, mkDt(11), DPS, rng())
    expect(result?.previousProgress).toBe(0)
    expect(result?.newProgress).toBe(1)
  })

  it('does not exceed segments (clamped at segments)', () => {
    // doom at progress=4, dt past reckoning → target=6=segments
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 4 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(71), DPS, rng())
    expect(result?.newProgress).toBe(6)
    expect(result?.newProgress).toBeLessThanOrEqual(doom.segments)
  })

  it('no stage crossed → empty firedStages and effects, progress still advances', () => {
    // progress 0 → 1; thresholds are 2 and 4, neither crossed
    const result = rollDoomTick(baseDoom, { connections: [supplyConn], pois: [] }, mkDt(11), DPS, rng())
    expect(result?.firedStages).toHaveLength(0)
    expect(result?.effects).toHaveLength(0)
    expect(result?.newProgress).toBe(1)
  })

  it('reckoned=false before reaching segments', () => {
    // progress 4, dt at 5/6 span → target=5, newProgress=5, not reckoned
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 4 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(51), DPS, rng())
    expect(result?.reckoned).toBe(false)
    expect(result?.newProgress).toBe(5)
  })

  it('reckoned=true when progress reaches segments', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 5 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(61), DPS, rng())
    expect(result?.reckoned).toBe(true)
    expect(result?.newProgress).toBe(6)
  })
})

// ── stage firing ──────────────────────────────────────────────────────────────

describe('rollDoomTick — stage firing', () => {
  it('fires a stage whose threshold is crossed', () => {
    // progress 1 → 2 (dt at day 21); threshold 2 is crossed
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())
    expect(result?.firedStages).toHaveLength(1)
    expect(result?.firedStages[0].threshold).toBe(2)
    expect(result?.firedStages[0].portent).toBe('First portent')
  })

  it('does not re-fire an already fired stage', () => {
    const doom = mkDoom({
      startDay: 1,
      reckonDay: 61,
      progress: 1,
      stages: [
        { threshold: 2, portent: 'P1', fired: true },
        { threshold: 4, portent: 'P2', fired: false },
      ],
    })
    const result = rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())
    expect(result?.firedStages).toHaveLength(0)
  })

  it('does not fire a stage whose threshold is above newProgress', () => {
    // progress 0 → 1 (dt at day 11); threshold 2 is not yet reached
    const doom = mkDoom({
      startDay: 1,
      reckonDay: 61,
      stages: [{ threshold: 2, portent: 'P', fired: false }],
    })
    const result = rollDoomTick(doom, emptyGraph, mkDt(11), DPS, rng())
    expect(result?.firedStages).toHaveLength(0)
  })

  it('fires multiple stages when progress skips several thresholds', () => {
    // progress 0 → 4 (dt at day 41); both thresholds 2 and 4 fire
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 0 })
    const result = rollDoomTick(doom, emptyGraph, mkDt(41), DPS, rng())
    expect(result?.newProgress).toBe(4)
    expect(result?.firedStages).toHaveLength(2)
    expect(result?.firedStages.map((s) => s.threshold)).toEqual([2, 4])
  })
})

// ── roads vector ──────────────────────────────────────────────────────────────

describe('rollDoomTick — roads vector', () => {
  // progress 1 → 2 (dt day 21) crosses threshold 2, generates an effect
  it('produces a cut_trade effect for a supplies connection', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'roads' })
    const result = rollDoomTick(doom, { connections: [supplyConn], pois: [] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0].kind).toBe('cut_trade')
    expect(result?.effects[0].targetId).toBe('conn-1')
    expect(result?.effects[0].description).toBeTruthy()
  })

  it('skips non-supplies connections', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'roads' })
    const result = rollDoomTick(doom, { connections: [nonSupplyConn], pois: [] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(0)
  })

  it('produces no effect when no supplies connections exist', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'roads' })
    const result = rollDoomTick(doom, emptyGraph, mkDt(21), DPS, rng())
    expect(result?.firedStages).toHaveLength(1)
    expect(result?.effects).toHaveLength(0)
  })

  it('ignores connections from a different worldId', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'roads' })
    const otherWorldConn: Connection = { ...supplyConn, worldId: 'other-world' }
    const result = rollDoomTick(doom, { connections: [otherWorldConn], pois: [] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(0)
  })
})

// ── water vector ──────────────────────────────────────────────────────────────

describe('rollDoomTick — water vector', () => {
  it('fouls a POI that needs water', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'water' })
    const result = rollDoomTick(doom, { connections: [], pois: [waterNeedPoi] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0].kind).toBe('foul_water')
    expect(result?.effects[0].targetId).toBe(waterNeedPoi.id)
  })

  it('fouls a POI that produces water', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'water' })
    const result = rollDoomTick(doom, { connections: [], pois: [waterProducePoi] }, mkDt(21), DPS, rng())
    expect(result?.effects[0].kind).toBe('foul_water')
    expect(result?.effects[0].targetId).toBe(waterProducePoi.id)
  })

  it('produces no effect when no water-related POIs exist', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'water' })
    const result = rollDoomTick(doom, { connections: [], pois: [tradePoi] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(0)
  })

  it('ignores POIs with no trade', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'water' })
    const result = rollDoomTick(doom, { connections: [], pois: [noTradePoi] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(0)
  })
})

// ── blight vector ─────────────────────────────────────────────────────────────

describe('rollDoomTick — blight vector', () => {
  it('spawns a problem on a trade POI', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'blight', keyedBiome: 'forest' })
    const result = rollDoomTick(doom, { connections: [], pois: [tradePoi] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(1)
    expect(result?.effects[0].kind).toBe('spawn_problem')
    expect(result?.effects[0].targetId).toBe(tradePoi.id)
  })

  it('produces no effect when no trade POIs exist', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'blight' })
    const result = rollDoomTick(doom, { connections: [], pois: [noTradePoi] }, mkDt(21), DPS, rng())
    expect(result?.effects).toHaveLength(0)
  })
})

// ── resource vector ───────────────────────────────────────────────────────────

describe('rollDoomTick — resource vector', () => {
  it('spawns a problem on a trade POI, themed by keyedResource', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'resource', keyedResource: 'iron' })
    const result = rollDoomTick(doom, { connections: [], pois: [tradePoi] }, mkDt(21), DPS, rng())
    expect(result?.effects[0].kind).toBe('spawn_problem')
    expect(result?.effects[0].description).toContain('iron')
  })
})

// ── determinism ───────────────────────────────────────────────────────────────

describe('rollDoomTick — determinism', () => {
  it('is deterministic under fixed seed', () => {
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'roads' })
    const graph: DoomGraph = { connections: [supplyConn], pois: [] }
    const r1 = rollDoomTick(doom, graph, mkDt(21), DPS, new SeededRandom(42))
    const r2 = rollDoomTick(doom, graph, mkDt(21), DPS, new SeededRandom(42))
    expect(r1?.effects[0].targetId).toBe(r2?.effects[0].targetId)
  })

  it('different seeds can yield different results with multiple targets', () => {
    const conn2: Connection = { ...supplyConn, id: 'conn-2' }
    const doom = mkDoom({ startDay: 1, reckonDay: 61, progress: 1, vector: 'roads' })
    const graph: DoomGraph = { connections: [supplyConn, conn2], pois: [] }
    const results = new Set<string>()
    for (let s = 0; s < 20; s++) {
      const r = rollDoomTick(doom, graph, mkDt(21), DPS, new SeededRandom(s))
      if (r?.effects[0]) results.add(r.effects[0].targetId)
    }
    expect(results.size).toBeGreaterThan(1)
  })
})

// ── effect count matches fired-stage count ────────────────────────────────────

describe('rollDoomTick — effect count matches fired-stage count when targets exist', () => {
  it('one fired stage + one target → one effect', () => {
    const doom = mkDoom({
      startDay: 1,
      reckonDay: 61,
      progress: 0,
      stages: [{ threshold: 1, portent: 'P1', fired: false }],
      vector: 'roads',
    })
    const result = rollDoomTick(doom, { connections: [supplyConn], pois: [] }, mkDt(11), DPS, rng())
    expect(result?.firedStages).toHaveLength(1)
    expect(result?.effects).toHaveLength(1)
  })
})
