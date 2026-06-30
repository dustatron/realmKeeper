import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import {
  resourceCountForSize,
  autoProposeResources,
  DEFAULT_PACKS,
  RESOURCE_PACKS,
} from './resourcePacks'
import { resourceByName } from './resources.catalog'

describe('resource packs', () => {
  it('high fantasy is on by default; sci-fi and doomed are opt-in', () => {
    expect(DEFAULT_PACKS).toContain('low-fantasy')
    expect(DEFAULT_PACKS).toContain('high-fantasy')
    expect(DEFAULT_PACKS).not.toContain('sci-fi')
    expect(DEFAULT_PACKS).not.toContain('doomed')
  })

  it('resource count grows with map size', () => {
    expect(resourceCountForSize('small')).toBeLessThan(resourceCountForSize('medium'))
    expect(resourceCountForSize('medium')).toBeLessThan(resourceCountForSize('large'))
  })
})

describe('autoProposeResources', () => {
  it('is deterministic for a given (packs, size, seed)', () => {
    const a = autoProposeResources(DEFAULT_PACKS, 'medium', new SeededRandom('seed-1'))
    const b = autoProposeResources(DEFAULT_PACKS, 'medium', new SeededRandom('seed-1'))
    expect(a).toEqual(b)
  })

  it('different seeds generally differ', () => {
    const a = autoProposeResources(DEFAULT_PACKS, 'large', new SeededRandom('seed-1'))
    const b = autoProposeResources(DEFAULT_PACKS, 'large', new SeededRandom('seed-2'))
    expect(a).not.toEqual(b)
  })

  it('respects the size target and returns distinct raw resources', () => {
    const res = autoProposeResources(DEFAULT_PACKS, 'medium', new SeededRandom('x'))
    expect(res.length).toBe(resourceCountForSize('medium'))
    expect(new Set(res).size).toBe(res.length)
    for (const name of res) {
      expect(resourceByName(name)?.tier).toBe('raw')
    }
  })

  it('only proposes resources from enabled packs', () => {
    const res = autoProposeResources(['low-fantasy'], 'small', new SeededRandom('x'))
    for (const name of res) {
      expect(resourceByName(name)?.packs).toContain('low-fantasy')
    }
  })

  it('spreads across multiple biomes', () => {
    const res = autoProposeResources(DEFAULT_PACKS, 'medium', new SeededRandom('spread'))
    const biomes = new Set(res.map((n) => resourceByName(n)?.biome))
    expect(biomes.size).toBeGreaterThanOrEqual(4)
  })

  it('never proposes more than the available pool', () => {
    // A single small pack with few resources caps the proposal at pool size.
    const res = autoProposeResources(['doomed'], 'large', new SeededRandom('cap'))
    const distinct = new Set(res)
    expect(res.length).toBe(distinct.size)
    // doomed has fewer than the large target (20), so it must be pool-capped.
    expect(res.length).toBeLessThan(resourceCountForSize('large'))
  })

  it('covers all declared packs as a known set', () => {
    expect(RESOURCE_PACKS).toEqual(['low-fantasy', 'high-fantasy', 'sci-fi', 'doomed'])
  })
})
