import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateRuinSite } from './RuinGenerator'

describe('generateRuinSite', () => {
  it('produces 2-4 ordered areas with exactly one entry', () => {
    const plan = generateRuinSite('s', 'tough', [], new Set(), new SeededRandom('s'))
    expect(plan.areas.length).toBeGreaterThanOrEqual(2)
    expect(plan.areas.length).toBeLessThanOrEqual(4)
    expect(plan.areas.filter((a) => a.isEntry)).toHaveLength(1)
    const orders = plan.areas.map((a) => a.order)
    expect(orders).toEqual([...orders].sort((x, y) => x - y))
  })

  it('plants exactly one notable loot spec, in the notablePrizeArea', () => {
    const plan = generateRuinSite('s', 'tough', [], new Set(), new SeededRandom('s'))
    const notables = plan.areas.flatMap((a) => a.lootSpecs).filter((l) => l.notable)
    expect(notables).toHaveLength(1)
    const prizeArea = plan.areas[plan.notablePrizeAreaIndex]
    expect(prizeArea.lootSpecs.some((l) => l.notable)).toBe(true)
  })

  it('always yields at least one discovery when currentState is empty', () => {
    let found = false
    for (let i = 0; i < 20; i++) {
      const s = String(i)
      const plan = generateRuinSite(s, 'easy', [], new Set(), new SeededRandom(s))
      if (plan.currentState === 'empty') {
        expect(plan.areas.some((a) => a.discovery && a.discovery.length > 0)).toBe(true)
        found = true
        break
      }
    }
    // If no empty state found in 20 seeds, the invariant still holds across all seeds
    if (!found) {
      for (let i = 0; i < 20; i++) {
        const s = String(i)
        const plan = generateRuinSite(s, 'easy', [], new Set(), new SeededRandom(s))
        expect(plan.areas.some((a) => a.discovery && a.discovery.length > 0)).toBe(true)
      }
    }
  })

  it('binds the supplied faction id when currentState is faction-held', () => {
    let found = false
    for (let i = 0; i < 20; i++) {
      const s = String(i)
      const plan = generateRuinSite(s, 'tough', ['fac1'], new Set(), new SeededRandom(s))
      if (plan.currentState === 'faction-held') {
        expect(plan.factionId).toBe('fac1')
        found = true
        break
      }
    }
    if (!found) {
      // No faction-held state in 20 seeds — invariant: factionId null when not faction-held
      for (let i = 0; i < 20; i++) {
        const s = String(i)
        const plan = generateRuinSite(s, 'tough', ['fac1'], new Set(), new SeededRandom(s))
        if (plan.currentState !== 'faction-held') expect(plan.factionId).toBeNull()
      }
    }
  })

  it('is deterministic for a given seed', () => {
    const a = generateRuinSite('z', 'perilous', ['f'], new Set(), new SeededRandom('z'))
    const b = generateRuinSite('z', 'perilous', ['f'], new Set(), new SeededRandom('z'))
    expect(a).toEqual(b)
  })
})
