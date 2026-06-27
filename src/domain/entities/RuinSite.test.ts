import { describe, it, expect } from 'vitest'
import type { RuinSite, RuinArea, OccupantGroup, RuinState } from './RuinSite'
import type { LandmarkLore } from './LandmarkLore'

describe('ruin/landmark types', () => {
  it('constructs a minimal RuinSite', () => {
    const og: OccupantGroup = { npcIds: ['n1'], activity: 'asleep' }
    const area: RuinArea = { name: 'Gatehouse', order: 0, isEntry: true, readAloud: 'x', detail: 'y', discovery: null, occupants: [og] }
    const state: RuinState = 'beast-claimed'
    const site: RuinSite = {
      origin: 'o', fall: 'f', builderCulture: 'b', era: 'e',
      currentState: state, factionId: null, hook: 'h',
      notablePrizeItemId: null, areas: [area],
    }
    expect(site.areas[0].occupants[0].npcIds).toEqual(['n1'])
  })

  it('constructs LandmarkLore', () => {
    const lore: LandmarkLore = {
      legend: 'l', truth: 't', secret: 's',
      interactionTrigger: 'when you touch it', interactionEffect: 'a vision',
      questHook: 'q', sensory: 'sn',
    }
    expect(lore.truth).toBe('t')
  })
})
