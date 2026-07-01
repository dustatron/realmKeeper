import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { resolveDoomTheme } from './doomThemes'

const VALID_VECTORS = ['roads', 'water', 'blight', 'resource'] as const

function assertValidTheme(theme: ReturnType<typeof resolveDoomTheme>) {
  expect(theme.name.length).toBeGreaterThan(0)
  expect(VALID_VECTORS).toContain(theme.vector)
  expect(theme.stages.length).toBeGreaterThanOrEqual(3)
  // thresholds must be ascending
  for (let i = 1; i < theme.stages.length; i++) {
    expect(theme.stages[i].threshold).toBeGreaterThan(theme.stages[i - 1].threshold)
  }
  // all thresholds in 1..6
  for (const s of theme.stages) {
    expect(s.threshold).toBeGreaterThanOrEqual(1)
    expect(s.threshold).toBeLessThanOrEqual(6)
    expect(s.portent.length).toBeGreaterThan(0)
  }
}

describe('resolveDoomTheme', () => {
  it('random label returns a valid theme', () => {
    const theme = resolveDoomTheme('random', undefined, new SeededRandom('seed1'))
    assertValidTheme(theme)
  })

  it('empty label returns a valid theme', () => {
    const theme = resolveDoomTheme('', undefined, new SeededRandom('seed2'))
    assertValidTheme(theme)
  })

  it('random with a pack returns a theme from that pack', () => {
    const theme = resolveDoomTheme('random', 'doomed', new SeededRandom('seed3'))
    assertValidTheme(theme)
    // All doomed themes: "The Tide of Ash", "The Cursed Lode", "The Dead Walk the Roads"
    const doomedNames = ['The Tide of Ash', 'The Cursed Lode', 'The Dead Walk the Roads']
    expect(doomedNames).toContain(theme.name)
  })

  it('specific known label returns that theme name and vector', () => {
    const theme = resolveDoomTheme('The Salt-Death', undefined, new SeededRandom('seed4'))
    expect(theme.name).toBe('The Salt-Death')
    expect(theme.vector).toBe('water')
    assertValidTheme(theme)
  })

  it('specific known label — The Wyrm Claims the Peak has roads vector', () => {
    const theme = resolveDoomTheme('The Wyrm Claims the Peak', undefined, new SeededRandom('seed5'))
    expect(theme.name).toBe('The Wyrm Claims the Peak')
    expect(theme.vector).toBe('roads')
  })

  it('specific known label — The Dead Walk the Roads', () => {
    const theme = resolveDoomTheme('The Dead Walk the Roads', 'doomed', new SeededRandom('seed6'))
    expect(theme.name).toBe('The Dead Walk the Roads')
    expect(theme.vector).toBe('roads')
  })

  it('unknown label falls back to random without throwing', () => {
    expect(() => {
      const theme = resolveDoomTheme('Totally Unknown Theme XYZ', undefined, new SeededRandom('seed7'))
      assertValidTheme(theme)
    }).not.toThrow()
  })

  it('is deterministic under a fixed seed', () => {
    const a = resolveDoomTheme('random', undefined, new SeededRandom('fixed'))
    const b = resolveDoomTheme('random', undefined, new SeededRandom('fixed'))
    expect(a.name).toBe(b.name)
    expect(a.vector).toBe(b.vector)
  })

  it('known label is deterministic regardless of rng', () => {
    const a = resolveDoomTheme('The Long Hunger', undefined, new SeededRandom('rng-a'))
    const b = resolveDoomTheme('The Long Hunger', undefined, new SeededRandom('rng-b'))
    expect(a.name).toBe('The Long Hunger')
    expect(b.name).toBe('The Long Hunger')
    expect(a.vector).toBe(b.vector)
  })
})
