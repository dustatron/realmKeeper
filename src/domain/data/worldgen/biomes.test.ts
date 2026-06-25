import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { BIOMES, BIOME_FEATURE_TABLES, pickBiomeFeature } from './biomes'

describe('worldgen biomes', () => {
  it('defines the 9 land biomes plus lake', () => {
    expect(BIOMES).toEqual([
      'forest', 'mountains', 'grasslands', 'desert', 'marsh',
      'frozen', 'blighted', 'hills', 'jungle', 'lake',
    ])
  })

  it('has a non-empty feature table for every biome', () => {
    for (const b of BIOMES) {
      expect(BIOME_FEATURE_TABLES[b].entries.length).toBeGreaterThan(0)
    }
  })

  it('pickBiomeFeature is deterministic for a given seed', () => {
    const a = pickBiomeFeature('forest', new SeededRandom('seed-1'))
    const b = pickBiomeFeature('forest', new SeededRandom('seed-1'))
    expect(a).toBe(b)
  })
})
