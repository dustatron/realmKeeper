import { describe, it, expect } from 'vitest'
import { rollCascade, type CascadeSection, type CascadeEffects } from './encounterCascade'

const fx = (category: string): CascadeEffects => ({
  rollDie: () => 1,
  rollReaction: () => ({ roll: 7, disposition: 'curious' }),
  generateNpc: async () => ({}) as any,
  matchMonster: () => null,
  matchLocation: (text) => (text.includes('Broken Tower') ? { poiId: 'p1', name: 'Broken Tower' } : null),
  now: () => 0,
})

describe('cascade locationMatch', () => {
  it('attaches locationMatch for a signOmen roll', async () => {
    const sections: CascadeSection[] = [{ category: 'signOmen', label: 'Sign / Omen', entries: ['tracks toward the Broken Tower'], isCustom: false }]
    const r = await rollCascade(sections, fx('signOmen'))
    expect(r.locationMatch).toEqual({ poiId: 'p1', name: 'Broken Tower' })
  })
  it('does not attach for creature/loss', async () => {
    const sections: CascadeSection[] = [{ category: 'loss', label: 'Loss', entries: ['Broken Tower mentioned'], isCustom: false }]
    const r = await rollCascade(sections, fx('loss'))
    expect(r.locationMatch ?? null).toBeNull()
  })
})
