import { describe, it, expect } from 'vitest'
import { hexesBetween, formatDistance } from './travel'

describe('hexesBetween', () => {
  it('returns 1 for two positions one hex apart', () => {
    // Pointy-top hex: one step right = q+1, x increases by sqrt(3)*size
    const a = { x: 0, y: 0 }
    const b = { x: Math.sqrt(3) * 40, y: 0 }
    expect(hexesBetween(a, b, 40)).toBe(1)
  })

  it('returns 0 for identical positions', () => {
    expect(hexesBetween({ x: 100, y: 200 }, { x: 100, y: 200 }, 40)).toBe(0)
  })
})

describe('formatDistance', () => {
  it('formats 1 hex correctly', () => {
    expect(formatDistance(1)).toBe('1 hex · 6 mi')
  })

  it('formats 2 hexes correctly', () => {
    expect(formatDistance(2)).toBe('2 hexes · 12 mi')
  })

  it('formats 5 hexes correctly', () => {
    expect(formatDistance(5)).toBe('5 hexes · 30 mi')
  })
})
