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
})
