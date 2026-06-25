import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { makeSeededDice } from './seededDice'

describe('makeSeededDice', () => {
  it('rolls NdM within range with the right number of dice', () => {
    const roll = makeSeededDice(new SeededRandom('s'))
    for (let i = 0; i < 50; i++) {
      const r = roll('3d6')
      expect(r.total).toBeGreaterThanOrEqual(3)
      expect(r.total).toBeLessThanOrEqual(18)
      expect(r.rolls).toHaveLength(3)
      expect(r.total).toBe(r.kept.reduce((a, b) => a + b, 0))
    }
  })

  it('defaults the count to 1 (d6)', () => {
    const r = makeSeededDice(new SeededRandom('s'))('1d6')
    expect(r.total).toBeGreaterThanOrEqual(1)
    expect(r.total).toBeLessThanOrEqual(6)
  })

  it('is deterministic for a given seed', () => {
    const a = makeSeededDice(new SeededRandom('z'))
    const b = makeSeededDice(new SeededRandom('z'))
    expect(a('3d6').total).toBe(b('3d6').total)
  })

  it('throws on invalid notation', () => {
    expect(() => makeSeededDice(new SeededRandom('s'))('garbage')).toThrow()
  })
})
