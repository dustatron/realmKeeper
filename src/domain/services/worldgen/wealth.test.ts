import { describe, expect, it } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import {
  WEALTH_BANDS,
  computeWealthScore,
  factionWealth,
  npcWealthTier,
  wealthBand,
  type NpcWealthTier,
  type WealthBand,
  type WealthNode,
} from './wealth'

const baseNode = (overrides: Partial<WealthNode> = {}): WealthNode => ({
  id: 'n',
  produces: null,
  role: 'extractor',
  tradeDegree: 0,
  hasWater: false,
  monopoly: false,
  ...overrides,
})

const bandRank = (band: WealthBand) => WEALTH_BANDS.indexOf(band)

describe('computeWealthScore', () => {
  it('refiner scores higher than an otherwise identical extractor', () => {
    const extractor = baseNode({ role: 'extractor' })
    const refiner = baseNode({ role: 'refiner' })
    expect(computeWealthScore(refiner)).toBeGreaterThan(
      computeWealthScore(extractor)
    )
  })

  it('is monotonic in tradeDegree', () => {
    const low = computeWealthScore(baseNode({ tradeDegree: 1 }))
    const mid = computeWealthScore(baseNode({ tradeDegree: 3 }))
    const high = computeWealthScore(baseNode({ tradeDegree: 6 }))
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })

  it('luxury produce beats bulk produce beats nothing', () => {
    const none = computeWealthScore(baseNode({ produces: null }))
    const bulk = computeWealthScore(
      baseNode({ produces: { weightClass: 'bulk' } })
    )
    const luxury = computeWealthScore(
      baseNode({ produces: { weightClass: 'luxury' } })
    )
    expect(none).toBeLessThan(bulk)
    expect(bulk).toBeLessThan(luxury)
  })

  it('water and monopoly each raise the score', () => {
    const plain = computeWealthScore(baseNode())
    expect(computeWealthScore(baseNode({ hasWater: true }))).toBeGreaterThan(
      plain
    )
    expect(computeWealthScore(baseNode({ monopoly: true }))).toBeGreaterThan(
      plain
    )
  })
})

describe('wealthBand', () => {
  it('buckets the spectrum into the five bands, ordered by score', () => {
    const isolated = baseNode({ role: 'extractor', tradeDegree: 0 })
    const richHub = baseNode({
      role: 'refiner',
      tradeDegree: 6,
      hasWater: true,
      monopoly: true,
      produces: { weightClass: 'luxury' },
    })
    expect(wealthBand(computeWealthScore(isolated))).toBe('destitute')
    expect(wealthBand(computeWealthScore(richHub))).toBe('rich')
  })

  it('richer trade-graph positions never yield a lower band', () => {
    const ladder: WealthNode[] = [
      baseNode({ role: 'extractor', tradeDegree: 0 }),
      baseNode({ role: 'extractor', tradeDegree: 2 }),
      baseNode({ role: 'refiner', tradeDegree: 2 }),
      baseNode({ role: 'refiner', tradeDegree: 4, hasWater: true }),
      baseNode({
        role: 'refiner',
        tradeDegree: 6,
        hasWater: true,
        monopoly: true,
        produces: { weightClass: 'luxury' },
      }),
    ]
    const ranks = ladder.map((n) => bandRank(wealthBand(computeWealthScore(n))))
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1])
    }
    // and the spread actually spans low to high
    expect(ranks[0]).toBe(bandRank('destitute'))
    expect(ranks[ranks.length - 1]).toBe(bandRank('rich'))
  })
})

describe('npcWealthTier', () => {
  const sampleTiers = (band: WealthBand, n = 1000): Record<NpcWealthTier, number> => {
    const rng = new SeededRandom(`tiers-${band}`)
    const counts: Record<NpcWealthTier, number> = {
      destitute: 0,
      poor: 0,
      middling: 0,
      wealthy: 0,
    }
    for (let i = 0; i < n; i++) counts[npcWealthTier(band, rng)]++
    return counts
  }

  it('a rich settlement yields a wide spread including an underclass', () => {
    const counts = sampleTiers('rich')
    // all four tiers represented
    expect(counts.wealthy).toBeGreaterThan(0)
    expect(counts.middling).toBeGreaterThan(0)
    expect(counts.poor).toBeGreaterThan(0)
    // a real underclass: some poor or destitute
    expect(counts.poor + counts.destitute).toBeGreaterThan(0)
    // but it still skews up: more middling+wealthy than poor+destitute
    expect(counts.middling + counts.wealthy).toBeGreaterThan(
      counts.poor + counts.destitute
    )
  })

  it('a destitute settlement is narrow and bottom-heavy', () => {
    const counts = sampleTiers('destitute')
    expect(counts.destitute + counts.poor).toBeGreaterThan(
      counts.middling + counts.wealthy
    )
    // almost no wealthy NPCs in a destitute town
    expect(counts.wealthy).toBe(0)
  })

  it('richer bands produce more wealthy NPCs than poorer bands', () => {
    const rich = sampleTiers('rich').wealthy
    const modest = sampleTiers('modest').wealthy
    const poor = sampleTiers('poor').wealthy
    expect(rich).toBeGreaterThan(modest)
    expect(modest).toBeGreaterThan(poor)
  })

  it('is deterministic for a given seed', () => {
    const a = new SeededRandom('seed-x')
    const b = new SeededRandom('seed-x')
    const seqA = Array.from({ length: 20 }, () => npcWealthTier('prosperous', a))
    const seqB = Array.from({ length: 20 }, () => npcWealthTier('prosperous', b))
    expect(seqA).toEqual(seqB)
  })
})

describe('factionWealth', () => {
  it('an empty territory is destitute', () => {
    expect(factionWealth([], false)).toBe('destitute')
  })

  it('rises as controlled bands get richer', () => {
    const poor = factionWealth(['poor', 'destitute', 'poor'], false)
    const mixed = factionWealth(['modest', 'poor', 'prosperous'], false)
    const rich = factionWealth(['rich', 'prosperous', 'rich'], false)
    expect(bandRank(mixed)).toBeGreaterThan(bandRank(poor))
    expect(bandRank(rich)).toBeGreaterThan(bandRank(mixed))
  })

  it('a monopoly bumps the aggregate band up', () => {
    const without = factionWealth(['modest', 'modest'], false)
    const withMono = factionWealth(['modest', 'modest'], true)
    expect(bandRank(withMono)).toBeGreaterThan(bandRank(without))
  })

  it('averages controlled bands', () => {
    // destitute(0) + rich(4) → avg 2 → modest
    expect(factionWealth(['destitute', 'rich'], false)).toBe('modest')
  })
})
