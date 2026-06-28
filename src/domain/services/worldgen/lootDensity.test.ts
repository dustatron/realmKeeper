import { describe, it, expect } from 'vitest'
import { LOOT_DENSITY, type LootDensity } from './lootDensity'

describe('LOOT_DENSITY', () => {
  it('maps each density to its multiplier', () => {
    expect(LOOT_DENSITY.off).toBe(0)
    expect(LOOT_DENSITY.sparse).toBe(0.5)
    expect(LOOT_DENSITY.moderate).toBe(1)
    expect(LOOT_DENSITY.frequent).toBe(2)
    const d: LootDensity = 'moderate'
    expect(LOOT_DENSITY[d]).toBe(1)
  })
})
