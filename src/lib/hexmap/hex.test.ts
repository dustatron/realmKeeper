import { describe, it, expect } from 'vitest'
import {
  axialToPixel, pixelToAxial, hexNeighbors, hexDistance, hexCorners,
} from './hex'

describe('hex math', () => {
  it('axialToPixel → pixelToAxial round-trips for a spread of hexes', () => {
    const size = 24
    for (const h of [{ q: 0, r: 0 }, { q: 3, r: -2 }, { q: -4, r: 5 }, { q: 7, r: 1 }]) {
      const back = pixelToAxial(axialToPixel(h, size), size)
      expect(back).toEqual(h)
    }
  })

  it('the origin hex sits at pixel (0,0)', () => {
    expect(axialToPixel({ q: 0, r: 0 }, 24)).toEqual({ x: 0, y: 0 })
  })

  it('hexNeighbors returns 6 distinct adjacent hexes', () => {
    const ns = hexNeighbors({ q: 2, r: 2 })
    expect(ns).toHaveLength(6)
    expect(new Set(ns.map((n) => `${n.q},${n.r}`)).size).toBe(6)
    for (const n of ns) expect(hexDistance({ q: 2, r: 2 }, n)).toBe(1)
  })

  it('hexDistance is symmetric and zero to self', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(hexDistance({ q: 3, r: -1 }, { q: 0, r: 0 }))
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3)
  })

  it('hexCorners returns 6 points around the center', () => {
    const corners = hexCorners({ x: 0, y: 0 }, 10)
    expect(corners).toHaveLength(6)
    for (const c of corners) {
      const radius = Math.hypot(c.x, c.y)
      expect(radius).toBeGreaterThan(9.9)
      expect(radius).toBeLessThan(10.1)
    }
  })
})
