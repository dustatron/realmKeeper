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
    expect(s).toEqual({ treasureCount: 0, magicCount: 0, highlights: [], monsters: [], bigMonsters: [] })
  })

  it('does not count authored NPC gear toward treasureCount — only seeded/findable items', () => {
    const npc: any = {
      systemBlock: {
        inventory: [
          // Authored starting gear — must NOT count
          { name: 'Boots', slots: 1, description: '', source: 'manual' },
          { name: 'Rope', slots: 1, description: '' },
          // Seeded items — MUST count
          { name: 'Old Coin Purse', slots: 1, description: '', source: 'treasure', notable: false },
          { name: 'Ember Ring', slots: 1, description: '', source: 'compendium', compendiumKind: 'magicItem', notable: true },
        ],
      },
    }
    const s = summarizeRegionContents([], [npc])
    // Only 'Old Coin Purse' (source:'treasure') and 'Ember Ring' (compendiumKind:'magicItem') count
    expect(s.treasureCount).toBe(2)
    expect(s.magicCount).toBe(1)
    expect(s.highlights.map((h) => h.name)).toContain('Ember Ring')
  })

  it('reports holder location per highlight and big monsters with location', () => {
    const mill = buildPOI({ regionId: 'r', name: 'Old Mill', type: 'landmark' })
    mill.treasure = [
      { id: 't1', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true, notable: true },
    ]
    // sd-monster-ape_snow has level 4 (threat >= 4) in the shadowdark compendium
    mill.monsterRefs = [{ id: 'sd-monster-ape_snow', quantity: 2 }]
    const s = summarizeRegionContents([mill], [])
    expect(s.highlights[0]).toMatchObject({ name: 'Sun Blade', location: 'Old Mill' })
    expect(s.bigMonsters.some((m) => m.location === 'Old Mill')).toBe(true)
    const snowApe = s.bigMonsters.find((m) => m.location === 'Old Mill')
    expect(snowApe).toBeDefined()
    expect(snowApe!.count).toBe(2)
  })

  it('excludes low-threat monsters from bigMonsters', () => {
    const p = buildPOI({ regionId: 'r', name: 'Cave', type: 'landmark' })
    // sd-monster-goblin has level 1 — below threshold
    p.monsterRefs = [{ id: 'sd-monster-goblin', quantity: 3 }]
    const s = summarizeRegionContents([p], [])
    // Still in monsters total, but not bigMonsters
    expect(s.monsters.length).toBeGreaterThan(0)
    expect(s.bigMonsters).toHaveLength(0)
    expect(s.bigMonsters.find((m) => m.name === 'Goblin')).toBeUndefined()
  })
})
