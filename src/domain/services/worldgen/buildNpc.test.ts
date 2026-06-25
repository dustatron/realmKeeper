import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnSystemConfig, shadowdarkSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { buildNpc } from './buildNpc'

const BASE = { worldId: 'w1', factionId: 'fac-1', regionId: 'reg-1', poiId: 'poi-1', role: 'leader' as const }

describe('buildNpc', () => {
  it('builds a named NPC linked to its world, faction, region, and POI', () => {
    const npc = buildNpc(BASE, cairnSystemConfig, new SeededRandom('s'))
    expect(npc.name.length).toBeGreaterThan(0)
    expect(npc.worldId).toBe('w1')
    expect(npc.factionIds).toContain('fac-1')
    expect(npc.regionId).toBe('reg-1')
    expect(npc.poiId).toBe('poi-1')
    expect(npc.lifeStatus).toBe('alive')
    expect(npc.movementStatus).toBe('present')
    expect(npc.traits.length).toBeGreaterThan(0)
    expect(npc.motivation.length).toBeGreaterThan(0)
  })

  it('rolls a Cairn SystemBlock with stats in range and positive HP', () => {
    const npc = buildNpc(BASE, cairnSystemConfig, new SeededRandom('cairn'))
    expect(npc.systemBlock.systemId).toBe(cairnSystemConfig.id)
    expect(npc.systemBlock.stats).toHaveLength(cairnSystemConfig.statFields.length)
    for (const s of npc.systemBlock.stats) {
      expect(s.value).toBeGreaterThanOrEqual(3)
      expect(s.value).toBeLessThanOrEqual(18)
    }
    expect(npc.systemBlock.hp).toBeGreaterThanOrEqual(1)
    expect(npc.systemBlock.maxHp).toBe(npc.systemBlock.hp)
  })

  it('fills level and class for a leveled/classed system (Shadowdark)', () => {
    const npc = buildNpc(BASE, shadowdarkSystemConfig, new SeededRandom('sd'))
    expect(npc.systemBlock.level).toBeGreaterThanOrEqual(1)
    expect((npc.systemBlock.className ?? '').length).toBeGreaterThan(0)
  })

  it('leaves faction empty when no factionId is given (e.g. a settlement local)', () => {
    const npc = buildNpc({ worldId: 'w1', regionId: 'reg-1', role: 'inhabitant' }, cairnSystemConfig, new SeededRandom('s'))
    expect(npc.factionIds).toEqual([])
  })

  it('is deterministic for a given seed', () => {
    const a = buildNpc(BASE, cairnSystemConfig, new SeededRandom('z'))
    const b = buildNpc(BASE, cairnSystemConfig, new SeededRandom('z'))
    expect(a.name).toBe(b.name)
    expect(a.systemBlock.stats.map((s) => s.value)).toEqual(b.systemBlock.stats.map((s) => s.value))
    expect(a.systemBlock.hp).toBe(b.systemBlock.hp)
  })
})
