import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { resourceByName } from '@domain/data/worldgen/resources.catalog'
import { assignRegionResources, biomeForResource } from './resourceBiome'

// A pool spanning several biomes (mountains, forest, grasslands, desert, marsh).
const DIVERSE_POOL = [
  'iron ore', // mountains
  'timber', // forest
  'grain', // grasslands
  'salt', // desert
  'peat', // marsh
  'copper', // hills
]

describe('biomeForResource', () => {
  it('returns the catalog biome for a raw resource', () => {
    expect(biomeForResource('iron ore')).toBe('mountains')
    expect(biomeForResource('timber')).toBe('forest')
  })

  it('returns null for finished goods and unknown names', () => {
    expect(biomeForResource('weapons')).toBeNull()
    expect(biomeForResource('not-a-resource')).toBeNull()
  })
})

describe('assignRegionResources', () => {
  it('returns exactly regionCount assignments', () => {
    const out = assignRegionResources(5, DIVERSE_POOL, new SeededRandom('seed-a'))
    expect(out).toHaveLength(5)
  })

  it('returns an empty array for non-positive region counts', () => {
    expect(assignRegionResources(0, DIVERSE_POOL, new SeededRandom('x'))).toEqual([])
    expect(assignRegionResources(-3, DIVERSE_POOL, new SeededRandom('x'))).toEqual([])
  })

  it("each assignment's biome equals its resource's catalog biome", () => {
    const out = assignRegionResources(8, DIVERSE_POOL, new SeededRandom('seed-b'))
    for (const a of out) {
      expect(a.biome).toBe(resourceByName(a.definingResource)?.biome)
    }
  })

  it('covers multiple biomes for a diverse pool across several regions', () => {
    const out = assignRegionResources(8, DIVERSE_POOL, new SeededRandom('seed-c'))
    const distinct = new Set(out.map((a) => a.biome))
    expect(distinct.size).toBeGreaterThanOrEqual(3)
  })

  it('is deterministic for the same seed', () => {
    const a = assignRegionResources(7, DIVERSE_POOL, new SeededRandom('same'))
    const b = assignRegionResources(7, DIVERSE_POOL, new SeededRandom('same'))
    expect(a).toEqual(b)
  })

  it('differs across seeds', () => {
    const a = assignRegionResources(7, DIVERSE_POOL, new SeededRandom('seed-1'))
    const b = assignRegionResources(7, DIVERSE_POOL, new SeededRandom('seed-2'))
    expect(a).not.toEqual(b)
  })

  it('handles a pool smaller than regionCount by allowing repeats', () => {
    const out = assignRegionResources(6, ['iron ore', 'timber'], new SeededRandom('small'))
    expect(out).toHaveLength(6)
    for (const a of out) {
      expect(['iron ore', 'timber']).toContain(a.definingResource)
      expect(a.biome).toBe(resourceByName(a.definingResource)?.biome)
    }
    // Both biomes should appear given the even round-robin spread.
    expect(new Set(out.map((a) => a.biome))).toEqual(new Set(['mountains', 'forest']))
  })

  it('falls back to the low-fantasy baseline for an empty pool', () => {
    const out = assignRegionResources(10, [], new SeededRandom('empty'))
    expect(out).toHaveLength(10)
    for (const a of out) {
      const def = resourceByName(a.definingResource)
      expect(def?.tier).toBe('raw')
      expect(def?.packs).toContain('low-fantasy')
      expect(a.biome).toBe(def?.biome)
    }
    // Baseline covers every land biome, so a 10-region world should be varied.
    expect(new Set(out.map((a) => a.biome)).size).toBeGreaterThanOrEqual(3)
  })

  it('falls back when the pool is all finished/unknown names', () => {
    const out = assignRegionResources(4, ['weapons', 'tools', 'nope'], new SeededRandom('fin'))
    expect(out).toHaveLength(4)
    for (const a of out) {
      const def = resourceByName(a.definingResource)
      expect(def?.tier).toBe('raw')
      expect(def?.packs).toContain('low-fantasy')
    }
  })
})
