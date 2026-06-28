import { describe, it, expect } from 'vitest'
import { regionDangerTier } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { getMonstersBySystemId, getCompendiumById } from '@domain/data/compendium'
import { monsterThreat } from '~/lib/worldgen/compendium-utils'

describe('regionDangerTier', () => {
  it('falls back to terrain tier with no monsters', () => {
    expect(regionDangerTier([], 'mountains')).toBe('perilous')
    expect(regionDangerTier([], 'plains')).toBe('easy')
  })
  it('uses max monster threat when monsters present', () => {
    // pick a high-threat monster so the tier rises above the (forest=tough) terrain floor
    const mons = getMonstersBySystemId('system-cairn-2e').filter((m) => monsterThreat(m) >= 5)
    if (mons.length === 0) return // compendium-dependent; skip if none
    const p = buildPOI({ regionId: 'r', name: 'Lair', type: 'dungeon' })
    p.monsterRefs = [{ id: mons[0].id, quantity: 1 }]
    expect(regionDangerTier([p], 'plains')).toBe('perilous')
  })
})
