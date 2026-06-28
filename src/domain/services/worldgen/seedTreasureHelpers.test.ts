import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { seedRegionMonsters } from './seedTreasureHelpers'
import { buildPOI } from './buildPoi'

describe('seedRegionMonsters — guardian collision handling', () => {
  it('bumps quantity when all picker attempts return same id (collision path)', () => {
    // Stub always returns the same monster — simulates a tiny bestiary
    const alwaysSame = () => ({ id: 'mon-x', name: 'Dragon' })

    const poi = buildPOI({ regionId: 'r1', name: 'Vault', type: 'landmark' })
    // Give the POI a notable treasure so the guardian pass fires
    poi.treasure = [{
      id: 'tr1', name: 'Ancient Coin', description: '', value: '50 gp',
      quantity: 1, collected: false, notable: true,
    }]

    const rng = new SeededRandom('collision-test')
    // perilous tier → GUARD_CHANCE = 0.75; monsterMult=1 → count=max(1,round(1*1*2))=2
    seedRegionMonsters([poi], 'perilous', 1, 'system-cairn-2e', rng, alwaysSame)

    const ref = poi.monsterRefs.find((r) => r.id === 'mon-x')
    expect(ref).toBeDefined()
    // The regional pass adds mon-x; the guardian pass collides all 5 retries → bumps quantity
    expect(ref!.quantity).toBeGreaterThanOrEqual(2)
  })

  it('adds guardian as a separate ref when picker returns a distinct id', () => {
    let call = 0
    // First call returns 'mon-a' (regional pick), subsequent calls return 'mon-b' (guardian retries)
    const alternating = () => {
      call++
      return call === 1 ? { id: 'mon-a', name: 'Wolf' } : { id: 'mon-b', name: 'Bear' }
    }

    const poi = buildPOI({ regionId: 'r1', name: 'Cache', type: 'natural' })
    poi.treasure = [{
      id: 'tr2', name: 'Gem', description: '', value: '100 gp',
      quantity: 1, collected: false, notable: true,
    }]

    const rng = new SeededRandom('distinct-test')
    seedRegionMonsters([poi], 'perilous', 1, 'system-cairn-2e', rng, alternating)

    const ids = poi.monsterRefs.map((r) => r.id)
    expect(ids).toContain('mon-a')
    expect(ids).toContain('mon-b')
  })
})
