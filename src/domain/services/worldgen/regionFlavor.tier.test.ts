import { describe, it, expect } from 'vitest'
import { biomeTier } from './regionFlavor'

describe('biomeTier', () => {
  it('maps biomes to tiers', () => {
    expect(biomeTier('grasslands')).toBe('easy')
    expect(biomeTier('forest')).toBe('tough')
    expect(biomeTier('mountains')).toBe('perilous')
  })
})
