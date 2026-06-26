import { describe, it, expect } from 'vitest'
import { streetLayout } from './streetLayout'

describe('streetLayout', () => {
  it('returns one slot per requested building', () => {
    expect(streetLayout(12, 1000, 1000, 'seed').slots).toHaveLength(12)
  })

  it('always emits at least the main street', () => {
    expect(streetLayout(4, 1000, 1000, 'seed').streets.length).toBeGreaterThanOrEqual(1)
  })

  it('adds cross streets when the main street overflows', () => {
    const { streets } = streetLayout(40, 1000, 1000, 'seed')
    expect(streets.length).toBeGreaterThan(1)
  })

  it('keeps slots inside the canvas', () => {
    for (const s of streetLayout(20, 1000, 1000, 'seed').slots) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThanOrEqual(1000)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThanOrEqual(1000)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(streetLayout(10, 1000, 1000, 'abc')).toEqual(streetLayout(10, 1000, 1000, 'abc'))
  })

  it('returns empty for zero buildings', () => {
    expect(streetLayout(0, 1000, 1000, 'seed')).toEqual({ streets: [], slots: [] })
  })
})
