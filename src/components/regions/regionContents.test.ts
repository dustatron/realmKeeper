import { describe, it, expect } from 'vitest'
import { summarizeRegionContents } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { getMagicItemsBySystemId } from '@domain/data/compendium'

describe('summarizeRegionContents', () => {
  it('splits treasures vs magic, retains ids, no double-count', () => {
    const poi = buildPOI({ regionId: 'r', name: 'Vault', type: 'dungeon' })
    poi.treasure = [
      { id: 't1', name: 'Gold Crown', description: '', value: '500 gp', quantity: 1, collected: false, notable: true, guardianNpcId: 'npc-9' },
      { id: 't2', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true },
    ]
    const c = summarizeRegionContents([poi], [])
    expect(c.treasures.map((t) => t.name)).toEqual(['Gold Crown'])
    expect(c.treasures[0].poiId).toBe(poi.id)
    expect(c.treasures[0].guardianNpcId).toBe('npc-9')
    expect(c.magic.map((m) => m.name)).toEqual(['Sun Blade'])
    expect(c.treasureCount).toBe(1)        // non-magic only — no double-count
    expect(c.magicCount).toBe(1)
  })

  it('NPC magicItem inventory item appears in magic with npcId', () => {
    const npc = {
      id: 'npc-1',
      name: 'Wizard',
      systemBlock: { inventory: [{ name: 'Ring of Power', compendiumKind: 'magicItem', source: 'loot' }] },
    } as any
    const c = summarizeRegionContents([], [npc])
    expect(c.magic).toHaveLength(1)
    expect(c.magic[0].name).toBe('Ring of Power')
    expect(c.magic[0].npcId).toBe('npc-1')
    expect(c.magic[0].poiId).toBeNull()
    expect(c.treasures).toHaveLength(0)
  })

  it('NPC treasure inventory item appears in treasures with npcId', () => {
    const npc = {
      id: 'npc-2',
      name: 'Bandit',
      systemBlock: { inventory: [{ name: 'Gold Coins', source: 'treasure', value: '50 gp', notable: false }] },
    } as any
    const c = summarizeRegionContents([], [npc])
    expect(c.treasures).toHaveLength(1)
    expect(c.treasures[0].name).toBe('Gold Coins')
    expect(c.treasures[0].npcId).toBe('npc-2')
    expect(c.treasures[0].poiId).toBeNull()
    expect(c.magic).toHaveLength(0)
  })

  it('POI magicItemRefs resolve via compendium and appear in magic', () => {
    const items = getMagicItemsBySystemId('system-cairn-2e')
    if (items.length === 0) return // skip gracefully if compendium has no magic items
    const poi = buildPOI({ regionId: 'r', name: 'Shrine', type: 'landmark' })
    poi.magicItemRefs = [{ id: items[0].id }]
    const c = summarizeRegionContents([poi], [])
    expect(c.magic).toHaveLength(1)
    expect(c.magic[0].name).toBe(items[0].name)
    expect(c.magic[0].poiId).toBe(poi.id)
    expect(c.magic[0].npcId).toBeNull()
  })

  it('monster ref with quantity 3 sums into monsterCount', () => {
    const poi = buildPOI({ regionId: 'r', name: 'Cave', type: 'dungeon' })
    // cairn-monster-acolyte is always present in the compendium
    poi.monsterRefs = [{ id: 'cairn-monster-acolyte', quantity: 3 }]
    const c = summarizeRegionContents([poi], [])
    expect(c.monsters).toHaveLength(1)
    expect(c.monsters[0].count).toBe(3)
    expect(c.monsterCount).toBe(3)
  })

  it('empty input returns all empty arrays and zero counts', () => {
    const c = summarizeRegionContents([], [])
    expect(c.treasures).toHaveLength(0)
    expect(c.magic).toHaveLength(0)
    expect(c.monsters).toHaveLength(0)
    expect(c.treasureCount).toBe(0)
    expect(c.magicCount).toBe(0)
    expect(c.monsterCount).toBe(0)
  })

  it('POI with undefined treasure does not throw', () => {
    const poi = buildPOI({ regionId: 'r', name: 'Old Ruin', type: 'dungeon' })
    // Simulate legacy POI with no treasure array
    ;(poi as any).treasure = undefined
    expect(() => summarizeRegionContents([poi], [])).not.toThrow()
  })
})
