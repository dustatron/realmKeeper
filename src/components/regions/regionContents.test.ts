import { describe, it, expect } from 'vitest'
import { summarizeRegionContents } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

describe('summarizeRegionContents', () => {
  it('counts treasure/magic, lists highlights and monsters', () => {
    const p = buildPOI({ regionId: 'r', name: 'p', type: 'landmark' })
    p.treasure = [
      { id: 't1', name: 'Gold', description: '', value: '10 gp', quantity: 1, collected: false },
      { id: 't2', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true, notable: true },
    ]
    p.monsterRefs = [{ id: 'mon-x', quantity: 2 }]
    const npc: any = { systemBlock: { inventory: [{ name: 'Ring of Y', slots: 1, description: '', source: 'compendium', compendiumKind: 'magicItem' }] } }
    const s = summarizeRegionContents([p], [npc])
    expect(s.treasureCount).toBe(3)       // 2 poi + 1 npc
    expect(s.magicCount).toBe(2)          // Sun Blade + Ring of Y
    expect(s.highlights.map((h) => h.name).sort()).toEqual(['Ring of Y', 'Sun Blade'])
    expect(s.monsters[0].count).toBe(2)
  })

  it('handles empty region', () => {
    const s = summarizeRegionContents([], [])
    expect(s).toEqual({ treasureCount: 0, magicCount: 0, highlights: [], monsters: [] })
  })
})
