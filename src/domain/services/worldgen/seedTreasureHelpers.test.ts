import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { seedRegionMonsters } from './seedTreasureHelpers'
import { buildPOI } from './buildPoi'

describe('seedRegionMonsters — guardian collision handling', () => {
  it('bumps quantity by exactly one when the guardian collides with the regional pick', () => {
    // Stub always returns the same monster — forces every guardian retry to collide.
    const alwaysSame = () => ({ id: 'mon-x', name: 'Dragon' })
    const qtyFor = (notable: boolean, seed: string) => {
      const poi = buildPOI({ regionId: 'r1', name: 'Vault', type: 'landmark' })
      if (notable) {
        poi.treasure = [{ id: 'tr1', name: 'Ancient Coin', description: '', value: '50 gp', quantity: 1, collected: false, notable: true }]
      }
      seedRegionMonsters([poi], 'perilous', 1, 'system-cairn-2e', new SeededRandom(seed), alwaysSame)
      return poi.monsterRefs.find((r) => r.id === 'mon-x')?.quantity ?? 0
    }
    // Same seed → identical regional placement; the ONLY difference is the guardian
    // pass (runs only when a notable find exists). Find a seed where the guardian
    // fires (0.75) and assert it bumps the regional qty by exactly 1 — proving the
    // guardian always lands on collision rather than being dropped.
    let proved = false
    for (const seed of ['g0', 'g1', 'g2', 'g3', 'g4', 'g5']) {
      const base = qtyFor(false, seed) // no notable → no guardian
      const guarded = qtyFor(true, seed) // notable → guardian collides → bump
      if (guarded === base + 1) { proved = true; break }
    }
    expect(proved).toBe(true)
  })

  it('adds the guardian as a separate ref when its pick is distinct from the regional one', () => {
    // count = max(1, round(1 * 0.5 * 1.5)) = 1 → regional places exactly one ('mon-a');
    // a firing guardian retry returns a distinct id ('mon-b') → separate ref.
    const stubFor = () => {
      let call = 0
      return () => { call++; return call === 1 ? { id: 'mon-a', name: 'Wolf' } : { id: 'mon-b', name: 'Bear' } }
    }
    let proved = false
    for (const seed of ['d0', 'd1', 'd2', 'd3', 'd4', 'd5']) {
      const poi = buildPOI({ regionId: 'r1', name: 'Cache', type: 'natural' })
      poi.treasure = [{ id: 'tr2', name: 'Gem', description: '', value: '100 gp', quantity: 1, collected: false, notable: true }]
      seedRegionMonsters([poi], 'tough', 0.5, 'system-cairn-2e', new SeededRandom(seed), stubFor())
      const ids = poi.monsterRefs.map((r) => r.id)
      if (ids.includes('mon-a') && ids.includes('mon-b')) { proved = true; break }
    }
    expect(proved).toBe(true)
  })
})
