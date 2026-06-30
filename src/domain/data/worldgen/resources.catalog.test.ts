import { describe, it, expect } from 'vitest'
import {
  RESOURCE_CATALOG,
  RESOURCE_BIOMES,
  resourceByName,
  rawResourcesForPacks,
  resourcesToBiomes,
  type ResourcePack,
} from './resources.catalog'

describe('resource catalog', () => {
  it('has unique resource names', () => {
    const names = RESOURCE_CATALOG.map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every raw resource maps to a valid land biome (never lake/null)', () => {
    for (const r of RESOURCE_CATALOG.filter((r) => r.tier === 'raw')) {
      expect(r.biome).not.toBeNull()
      expect(RESOURCE_BIOMES).toContain(r.biome)
    }
  })

  it('every finished good is biome-agnostic (biome null)', () => {
    for (const r of RESOURCE_CATALOG.filter((r) => r.tier === 'finished')) {
      expect(r.biome).toBeNull()
    }
  })

  it('every resource belongs to at least one pack with a positive rarity weight', () => {
    for (const r of RESOURCE_CATALOG) {
      expect(r.packs.length).toBeGreaterThan(0)
      expect(r.rarityWeight).toBeGreaterThan(0)
    }
  })

  it('the low-fantasy baseline covers every land biome', () => {
    const lowFantasyBiomes = new Set(
      RESOURCE_CATALOG
        .filter((r) => r.tier === 'raw' && r.packs.includes('low-fantasy'))
        .map((r) => r.biome),
    )
    for (const biome of RESOURCE_BIOMES) {
      expect(lowFantasyBiomes.has(biome)).toBe(true)
    }
  })

  it('every pack offers a blighted (wastes) resource', () => {
    const packs: ResourcePack[] = ['low-fantasy', 'high-fantasy', 'sci-fi', 'doomed']
    for (const pack of packs) {
      const hasBlighted = RESOURCE_CATALOG.some(
        (r) => r.tier === 'raw' && r.biome === 'blighted' && r.packs.includes(pack),
      )
      expect(hasBlighted).toBe(true)
    }
  })

  it('resourceByName resolves known names and rejects unknown', () => {
    expect(resourceByName('iron ore')?.biome).toBe('mountains')
    expect(resourceByName('not-a-real-resource')).toBeUndefined()
  })

  it('rawResourcesForPacks returns only raw resources from enabled packs', () => {
    const res = rawResourcesForPacks(['sci-fi'])
    expect(res.length).toBeGreaterThan(0)
    for (const r of res) {
      expect(r.tier).toBe('raw')
      expect(r.packs).toContain('sci-fi')
    }
    // Low-fantasy-only resources must not appear under a sci-fi-only pool.
    expect(res.some((r) => r.name === 'iron ore')).toBe(false)
  })
})

describe('resourcesToBiomes', () => {
  it('counts raw resources against their biome', () => {
    const counts = resourcesToBiomes(['iron ore', 'coal', 'timber'])
    expect(counts.mountains).toBe(2)
    expect(counts.forest).toBe(1)
  })

  it('ignores finished goods and unknown names', () => {
    const counts = resourcesToBiomes(['weapons', 'tools', 'nonsense'])
    expect(Object.keys(counts).length).toBe(0)
  })

  it('returns an empty map for no resources', () => {
    expect(resourcesToBiomes([])).toEqual({})
  })
})
