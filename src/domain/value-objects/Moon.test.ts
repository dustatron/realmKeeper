import { describe, it, expect } from 'vitest'
import { moonPhase, MOON_PHASE_NAMES } from './Moon'

describe('moonPhase', () => {
  it('campaign day 1 is the new moon', () => {
    const p = moonPhase(1, 28)
    expect(p.fraction).toBe(0)
    expect(p.index).toBe(0)
    expect(p.name).toBe('New Moon')
  })

  it('half a cycle in is the full moon', () => {
    const p = moonPhase(1 + 14, 28) // 14 days into a 28-day cycle
    expect(p.fraction).toBeCloseTo(0.5)
    expect(p.name).toBe('Full Moon')
  })

  it('a quarter cycle in is the first quarter', () => {
    expect(moonPhase(1 + 7, 28).name).toBe('First Quarter')
  })

  it('three quarters in is the last quarter', () => {
    expect(moonPhase(1 + 21, 28).name).toBe('Last Quarter')
  })

  it('wraps back to the new moon after a full cycle', () => {
    expect(moonPhase(1 + 28, 28).name).toBe('New Moon')
  })

  it('handles days before the anchor without going negative', () => {
    const p = moonPhase(-6, 28) // 7 days before day 1 → last quarter region
    expect(p.fraction).toBeGreaterThanOrEqual(0)
    expect(p.fraction).toBeLessThan(1)
    expect(MOON_PHASE_NAMES).toContain(p.name)
  })

  it('falls back to the default cycle when given a non-positive length', () => {
    expect(moonPhase(1, 0).name).toBe('New Moon')
  })
})
