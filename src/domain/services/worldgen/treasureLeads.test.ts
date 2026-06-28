import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { planTreasureLeads, type LeadTarget } from './treasureLeads'

const targets: LeadTarget[] = [
  { kind: 'item', itemId: 'i1', itemName: 'Sun Blade', isMagic: true, containerType: 'poi', containerId: 'poiA', regionId: 'r1' },
  { kind: 'item', itemId: 'i2', itemName: 'Ember Ring', isMagic: true, containerType: 'npc', containerId: 'npcG', regionId: 'r1' },
]
// I1 fix: npcG is now in the pool (it was the holder for i2, so it should always be excluded)
const sources = {
  settlements: [{ kind: 'tavern' as const, poiId: 'town1', isSettlement: true }, { kind: 'notice' as const, poiId: 'town1', isSettlement: true }],
  npcs: [{ kind: 'npc' as const, npcId: 'npcE' }, { kind: 'npc' as const, npcId: 'npcG' }],
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

  it('excludes holder npc from leads even when holder is in the npc pool (I1)', () => {
    // npcG is now in the pool but is also the holder for i2 — must never be chosen as placement
    const seeds = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8']
    for (const seed of seeds) {
      const plans = planTreasureLeads(targets, sources, new SeededRandom(seed))
      const forI2 = plans.filter((p) => p.target.itemId === 'i2')
      for (const p of forI2) {
        expect(p.source.npcId).not.toBe('npcG')
      }
    }
    // Sanity: at least one seed produces a lead for i2, confirming the npc path is exercised
    const aggregated = seeds.flatMap((seed) =>
      planTreasureLeads(targets, sources, new SeededRandom(seed)).filter((p) => p.target.itemId === 'i2'),
    )
    expect(aggregated.length).toBeGreaterThan(0)
  })

  it('is deterministic', () => {
    const a = planTreasureLeads(targets, sources, new SeededRandom('z'))
    const b = planTreasureLeads(targets, sources, new SeededRandom('z'))
    expect(a).toEqual(b)
  })

  it('respects the per-settlement cap', () => {
    const many: LeadTarget[] = Array.from({ length: 20 }, (_, i) => ({ kind: 'item' as const, itemId: 'x' + i, itemName: 'X', isMagic: false, containerType: 'poi' as const, containerId: 'p' + i, regionId: 'r1' }))
    const plans = planTreasureLeads(many, sources, new SeededRandom('c'), { perSettlementCap: 2 })
    const atTown1 = plans.filter((p) => (p.source.kind === 'tavern' || p.source.kind === 'notice') && p.source.poiId === 'town1')
    expect(atTown1.length).toBeLessThanOrEqual(2)
  })

  it('handles landmark targets: ≥1 lead, placement poi != landmark poi (I2)', () => {
    const landmarkTarget: LeadTarget = { kind: 'landmark', landmarkPoiId: 'lm1', secret: 'x', regionId: 'r1' }
    const lmSources = {
      settlements: [
        { kind: 'tavern' as const, poiId: 'lm1', isSettlement: true },    // same POI as landmark — must be excluded
        { kind: 'tavern' as const, poiId: 'town2', isSettlement: true },   // different — eligible
        { kind: 'notice' as const, poiId: 'town2', isSettlement: true },
      ],
      npcs: [{ kind: 'npc' as const, npcId: 'npcX' }],
      otherSites: [
        { kind: 'note' as const, poiId: 'lm1' },     // same POI as landmark — must be excluded
        { kind: 'note' as const, poiId: 'ruinC' },   // different — eligible
      ],
    }
    const seeds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    const allPlans = seeds.flatMap((seed) =>
      planTreasureLeads([landmarkTarget], lmSources, new SeededRandom(seed)),
    )
    // Must produce at least one lead across the seeds
    expect(allPlans.length).toBeGreaterThanOrEqual(1)
    // No lead may point back to the landmark's own POI
    for (const p of allPlans) {
      expect(p.source.poiId).not.toBe('lm1')
    }
  })
})
