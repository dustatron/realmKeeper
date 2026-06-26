import { describe, it, expect } from 'vitest'
import { hexesBetween, formatTravel } from './travel'

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

describe('formatTravel', () => {
  it('formats 1 hex correctly', () => {
    expect(formatTravel(1)).toBe('1 hex · 6 mi · 4h')
  })

  it('formats 2 hexes correctly', () => {
    expect(formatTravel(2)).toBe('2 hexes · 12 mi · 1 day')
  })

  it('formats 3 hexes correctly', () => {
    expect(formatTravel(3)).toBe('3 hexes · 18 mi · 1 day 4h')
  })

  it('formats 5 hexes correctly', () => {
    expect(formatTravel(5)).toBe('5 hexes · 30 mi · 2 days 4h')
  })

  it('formats 4 hexes correctly (exact days, no hours)', () => {
    expect(formatTravel(4)).toBe('4 hexes · 24 mi · 2 days')
  })
})
