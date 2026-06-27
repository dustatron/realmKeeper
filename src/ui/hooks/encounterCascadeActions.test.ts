import { describe, it, expect } from 'vitest'
import { buildCascadeEffects } from '@application/use-cases/RollEncounterCascade'

const ctx = {
  table: null,
  poiId: 'p1',
  regionId: null,
  worldId: 'w1',
  systemConfig: { id: 'system-shadowdark' } as any,
}

describe('buildCascadeEffects', () => {
  it('rollDie returns a value within 1..sides', () => {
    const fx = buildCascadeEffects(ctx as any, {} as any)
    const v = fx.rollDie(6)
    expect(v).toBeGreaterThanOrEqual(1)
    expect(v).toBeLessThanOrEqual(6)
  })

  it('rollReaction returns a 2..12 roll and a disposition', () => {
    const fx = buildCascadeEffects(ctx as any, {} as any)
    const r = fx.rollReaction()
    expect(r.roll).toBeGreaterThanOrEqual(2)
    expect(r.roll).toBeLessThanOrEqual(12)
    expect(['hostile', 'wary', 'curious', 'kind', 'helpful']).toContain(r.disposition)
  })

  it('matchMonster delegates to the compendium matcher for the ctx system', () => {
    const fx = buildCascadeEffects(ctx as any, {} as any)
    // a clearly-non-monster string yields null
    expect(fx.matchMonster('a quiet breeze')).toBeNull()
  })
})
