import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickName, NAME_KINDS } from './names'

describe('worldgen names', () => {
  it('produces a non-empty name for every kind', () => {
    for (const kind of NAME_KINDS) {
      expect(pickName(kind, new SeededRandom('s')).length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(pickName('settlement', new SeededRandom('x'))).toBe(
      pickName('settlement', new SeededRandom('x')),
    )
  })

  it('varies across draws from one rng', () => {
    const rng = new SeededRandom('y')
    const names = new Set(Array.from({ length: 8 }, () => pickName('settlement', rng)))
    expect(names.size).toBeGreaterThan(1)
  })

  it('region names vary widely across many draws (not repetitive)', () => {
    const rng = new SeededRandom('regions')
    const names = new Set(Array.from({ length: 50 }, () => pickName('region', rng)))
    // A single <adj> <noun> template repeats heavily; a rich namespace should not.
    expect(names.size).toBeGreaterThanOrEqual(45)
  })

  it('region naming is deterministic with a biome', () => {
    expect(pickName('region', new SeededRandom('z'), { biome: 'forest' })).toBe(
      pickName('region', new SeededRandom('z'), { biome: 'forest' }),
    )
  })

  it('produces a non-empty region name when given a biome', () => {
    for (const biome of ['forest', 'mountains', 'desert', 'frozen'] as const) {
      expect(
        pickName('region', new SeededRandom('b'), { biome }).length,
      ).toBeGreaterThan(0)
    }
  })
})
