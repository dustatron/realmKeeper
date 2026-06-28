import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { planTreasureLeads, type LeadTarget } from './treasureLeads'

const targets: LeadTarget[] = [
  { kind: 'item', itemId: 'i1', itemName: 'Sun Blade', isMagic: true, containerType: 'poi', containerId: 'poiA', regionId: 'r1' },
  { kind: 'item', itemId: 'i2', itemName: 'Ember Ring', isMagic: true, containerType: 'npc', containerId: 'npcG', regionId: 'r1' },
]
const sources = {
  settlements: [{ kind: 'tavern' as const, poiId: 'town1', isSettlement: true }, { kind: 'notice' as const, poiId: 'town1', isSettlement: true }],
  npcs: [{ kind: 'npc' as const, npcId: 'npcE' }],
  otherSites: [{ kind: 'note' as const, poiId: 'ruinB' }],
}

describe('planTreasureLeads', () => {
  it('produces 1-2 leads per target, placement != target holder', () => {
    const plans = planTreasureLeads(targets, sources, new SeededRandom('s'))
    for (const t of targets) {
      const forT = plans.filter((p) => p.target.itemId === t.itemId)
      expect(forT.length).toBeGreaterThanOrEqual(1)
      expect(forT.length).toBeLessThanOrEqual(2)
      for (const p of forT) {
        expect(p.source.poiId).not.toBe(t.containerId)
        expect(p.source.npcId).not.toBe(t.containerId)
      }
    }
  })
  it('is deterministic', () => {
    const a = planTreasureLeads(targets, sources, new SeededRandom('z'))
    const b = planTreasureLeads(targets, sources, new SeededRandom('z'))
    expect(a).toEqual(b)
  })
  it('respects the per-settlement cap', () => {
    const many: LeadTarget[] = Array.from({ length: 20 }, (_, i) => ({ kind: 'item', itemId: 'x' + i, itemName: 'X', isMagic: false, containerType: 'poi', containerId: 'p' + i, regionId: 'r1' }))
    const plans = planTreasureLeads(many, sources, new SeededRandom('c'), { perSettlementCap: 2 })
    const atTown1 = plans.filter((p) => (p.source.kind === 'tavern' || p.source.kind === 'notice') && p.source.poiId === 'town1')
    expect(atTown1.length).toBeLessThanOrEqual(2)
  })
})
