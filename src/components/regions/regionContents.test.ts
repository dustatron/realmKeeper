import { describe, it, expect } from 'vitest'
import { summarizeRegionContents } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

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
})
