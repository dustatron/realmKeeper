import { describe, it, expect } from 'vitest'
import { RUIN_CREATURE_POOLS, ruinCreatureLevel } from './ruinCreaturePools'

describe('ruin creature pools', () => {
  it('every non-empty state has a non-empty pool', () => {
    for (const state of ['beast-claimed','faction-held','haunted','cult-site'] as const) {
      expect(RUIN_CREATURE_POOLS[state].length).toBeGreaterThan(0)
    }
  })
  it('danger bands rise with tier for shadowdark', () => {
    expect(ruinCreatureLevel('easy','system-shadowdark')).toBeLessThan(ruinCreatureLevel('perilous','system-shadowdark'))
  })
  it('cairn caps are tighter than shadowdark levels', () => {
    expect(ruinCreatureLevel('easy','system-cairn-2e')).toBeLessThanOrEqual(ruinCreatureLevel('easy','system-shadowdark'))
  })
})
