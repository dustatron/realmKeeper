import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildCivicFlavor } from './eventFlavor'

describe('buildCivicFlavor', () => {
  it('is deterministic for a seed and names the settlement', () => {
    const a = buildCivicFlavor('festival', 'summer', 'Briar', new SeededRandom('s'))
    const b = buildCivicFlavor('festival', 'summer', 'Briar', new SeededRandom('s'))
    expect(a).toEqual(b)
    expect(a.name.length).toBeGreaterThan(0)
    expect(a.description).toContain('Briar')
  })

  it('produces a market with the settlement name', () => {
    const m = buildCivicFlavor('market', 'spring', 'Oakford', new SeededRandom('m'))
    expect(m.name.length).toBeGreaterThan(0)
    expect(m.description).toContain('Oakford')
  })
})
