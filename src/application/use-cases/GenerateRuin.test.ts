import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeGenerateRuin } from './GenerateRuin'

const container = createContainer()
const deps = () => ({ poiRepo: container.poiRepo, npcRepo: container.npcRepo, regionRepo: container.regionRepo })

beforeEach(async () => { await db.open(); await Promise.all([db.pois.clear(), db.npcs.clear(), db.regions.clear()]) })

async function seedRuin(systemId: string, seed = 'ruin-1') {
  await db.regions.put({ id: 'r1', terrain: 'mountains' } as any) // perilous → occupants likely
  const poi = buildPOI({ regionId: 'r1', name: 'Old Fort', type: 'ruin' })
  await db.pois.put(poi)
  await executeGenerateRuin({ poiId: poi.id, worldId: 'w', systemId, seed }, deps())
  return (await db.pois.get(poi.id))!
}

describe('executeGenerateRuin', () => {
  for (const systemId of ['system-cairn-2e', 'system-shadowdark']) {
    it(`generates a ruin for ${systemId}: lore, areas, loot single-source, notable prize`, async () => {
      const saved = await seedRuin(systemId)
      expect(saved.ruinSite).not.toBeNull()
      expect(saved.ruinSite!.areas.length).toBeGreaterThanOrEqual(2)
      // loot lives only on poi.treasure, tagged with areaIndex
      expect(saved.treasure.length).toBeGreaterThan(0)
      expect(saved.treasure.every((t) => typeof t.areaIndex === 'number')).toBe(true)
      const notable = saved.treasure.filter((t) => t.notable)
      expect(notable).toHaveLength(1)
      expect(saved.ruinSite!.notablePrizeItemId).toBe(notable[0].id)
      // occupant npcs (if any) are linked to the ruin POI and referenced by areas
      const npcs = await db.npcs.where('poiId').equals(saved.id).toArray()
      const refIds = saved.ruinSite!.areas.flatMap((a) => a.occupants.flatMap((o) => o.npcIds))
      // At least one of the two systems should produce occupants in a mountains/perilous biome
      // (asserted separately in the occupant-linkage test below)
      for (const id of refIds) expect(npcs.some((n) => n.id === id)).toBe(true)
    })
  }

  it('both systems produce occupants in a perilous biome and all are properly linked', async () => {
    for (const systemId of ['system-cairn-2e', 'system-shadowdark']) {
      // Reset DB between systems
      await Promise.all([db.pois.clear(), db.npcs.clear(), db.regions.clear()])
      const saved = await seedRuin(systemId, 'ruin-occupants')
      const npcs = await db.npcs.where('poiId').equals(saved.id).toArray()
      const refIds = saved.ruinSite!.areas.flatMap((a) => a.occupants.flatMap((o) => o.npcIds))
      // mountains/perilous biome + fixed seed: expect occupants to be generated
      expect(refIds.length).toBeGreaterThan(0)
      expect(npcs.length).toBeGreaterThan(0)
      // Every referenced NPC id is in the saved NPC list
      for (const id of refIds) expect(npcs.some((n) => n.id === id)).toBe(true)
    }
  })

  it('regen wipes prior occupant NPCs (no dupes)', async () => {
    // 'ruin-occupants' + mountains is proven to produce occupants, so there is
    // something to wipe (guards against a vacuous test).
    const first = await seedRuin('system-shadowdark', 'ruin-occupants')
    const priorNpcs = await db.npcs.where('poiId').equals(first.id).toArray()
    const priorIds = new Set(priorNpcs.map((n) => n.id))
    expect(priorIds.size).toBeGreaterThan(0)
    await executeGenerateRuin({ poiId: first.id, worldId: 'w', systemId: 'system-shadowdark', seed: 'ruin-2' }, deps())
    const afterNpcs = await db.npcs.where('poiId').equals(first.id).toArray()
    const afterIds = afterNpcs.map((n) => n.id)
    // None of the prior NPC ids survive: old occupants truly wiped (not additive)
    for (const id of priorIds) {
      expect(afterIds).not.toContain(id)
    }
  })

  it('magic notable prize is reachable (~60% chance per ruin)', async () => {
    // Fixed seeds — tested locally to ensure at least one hits isMagic
    const seeds = ['ruin-magic-1', 'ruin-magic-2', 'ruin-magic-3', 'ruin-magic-4', 'ruin-magic-5']
    let foundMagic = false
    for (const seed of seeds) {
      await Promise.all([db.pois.clear(), db.npcs.clear(), db.regions.clear()])
      const saved = await seedRuin('system-cairn-2e', seed)
      const notable = saved.treasure.find((t) => t.notable)
      if (notable?.isMagic) { foundMagic = true; break }
    }
    expect(foundMagic).toBe(true)
  })
})
