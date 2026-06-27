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

  it('always yields at least one discovery (even when empty)', () => {
    // Search seeds is overkill; assert the invariant on several seeds
    for (const s of ['a', 'b', 'c', 'd', 'e']) {
      const plan = generateRuinSite(s, 'easy', [], new Set(), new SeededRandom(s))
      expect(plan.areas.some((a) => a.discovery && a.discovery.length > 0)).toBe(true)
    }
  })

  it('binds a faction only when faction-held and factions exist', () => {
    const plan = generateRuinSite('s', 'tough', ['fac1'], new Set(), new SeededRandom('s'))
    if (plan.currentState === 'faction-held') expect(plan.factionId).toBe('fac1')
    else expect(plan.factionId).toBeNull()
  })

  it('is deterministic for a given seed', () => {
    const a = generateRuinSite('z', 'perilous', ['f'], new Set(), new SeededRandom('z'))
    const b = generateRuinSite('z', 'perilous', ['f'], new Set(), new SeededRandom('z'))
    expect(a).toEqual(b)
  })
})
