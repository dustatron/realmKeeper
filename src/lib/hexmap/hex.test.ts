import { describe, it, expect } from 'vitest'
import {
  axialToPixel, pixelToAxial, hexNeighbors, hexDistance, hexCorners, hexLine,
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

  it('hexLine connects two hexes with contiguous steps', () => {
    const a = { q: 0, r: 0 }
    const b = { q: 3, r: -1 }
    const line = hexLine(a, b)
    // includes both endpoints
    expect(line[0]).toEqual(a)
    expect(line[line.length - 1]).toEqual(b)
    // length is distance + 1
    expect(line).toHaveLength(hexDistance(a, b) + 1)
    // every consecutive pair is adjacent
    for (let i = 1; i < line.length; i++) {
      expect(hexDistance(line[i - 1], line[i])).toBe(1)
    }
  })

  it('hexLine from a hex to itself is just that hex', () => {
    expect(hexLine({ q: 2, r: 2 }, { q: 2, r: 2 })).toEqual([{ q: 2, r: 2 }])
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
