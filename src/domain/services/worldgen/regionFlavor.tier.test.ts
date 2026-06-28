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

  it('maps edit-UI terrain words (not just biome keys)', () => {
    // singular 'mountain' (UI) vs 'mountains' (biome) — both perilous now
    expect(tierForTerrain('mountain')).toBe('perilous')
    expect(tierForTerrain('tundra')).toBe('perilous')
    expect(tierForTerrain('swamp')).toBe('tough')
    expect(tierForTerrain('wetlands')).toBe('tough')
    expect(tierForTerrain('coast')).toBe('tough')
    expect(tierForTerrain('highlands')).toBe('tough')
    expect(tierForTerrain('plains')).toBe('easy')
    expect(tierForTerrain('fields')).toBe('easy')
    expect(tierForTerrain('road')).toBe('easy')
    // case-insensitive + true unknowns still default easy
    expect(tierForTerrain('Mountain')).toBe('perilous')
    expect(tierForTerrain('xyzzy')).toBe('easy')
  })
})
