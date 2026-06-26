import { describe, it, expect } from 'vitest'
import { gridPositions } from './gridPositions'

describe('gridPositions', () => {
  it('returns one position per item', () => {
    expect(gridPositions(8, 1000, 1000)).toHaveLength(8)
  })

  it('keeps every point inside the canvas margins', () => {
    for (const p of gridPositions(10, 1000, 1000)) {
      expect(p.x).toBeGreaterThan(100)
      expect(p.x).toBeLessThan(900)
      expect(p.y).toBeGreaterThan(100)
      expect(p.y).toBeLessThan(900)
    }
  })

  it('spreads points apart (not all stacked at one spot)', () => {
    const pts = gridPositions(4, 1000, 1000)
    const unique = new Set(pts.map((p) => `${p.x},${p.y}`))
    expect(unique.size).toBe(4)
  })

  it('returns empty for zero or negative counts', () => {
    expect(gridPositions(0, 1000, 1000)).toEqual([])
    expect(gridPositions(-3, 1000, 1000)).toEqual([])
  })
})
