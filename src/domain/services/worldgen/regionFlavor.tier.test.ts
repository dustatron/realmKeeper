import { describe, it, expect } from 'vitest'
import { biomeTier, tierForTerrain } from './regionFlavor'

describe('biomeTier', () => {
  it('maps biomes to tiers', () => {
    expect(biomeTier('grasslands')).toBe('easy')
    expect(biomeTier('forest')).toBe('tough')
    expect(biomeTier('mountains')).toBe('perilous')
  })
})

describe('tierForTerrain', () => {
  it('maps biomes and falls back to easy', () => {
    expect(tierForTerrain('mountains')).toBe('perilous')
    expect(tierForTerrain('not-a-biome')).toBe('easy')
  })
})
