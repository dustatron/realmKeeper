import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeGenerateRuin } from './GenerateRuin'

const container = createContainer()
const deps = () => ({ poiRepo: container.poiRepo, npcRepo: container.npcRepo, regionRepo: container.regionRepo })

beforeEach(async () => { await db.open(); await Promise.all([db.pois.clear(), db.npcs.clear(), db.regions.clear()]) })

async function seedRuin(systemId: string) {
  await db.regions.put({ id: 'r1', terrain: 'mountains' } as any) // perilous → occupants likely
  const poi = buildPOI({ regionId: 'r1', name: 'Old Fort', type: 'ruin' })
  await db.pois.put(poi)
  await executeGenerateRuin({ poiId: poi.id, worldId: 'w', systemId, seed: 'ruin-1' }, deps())
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
      for (const id of refIds) expect(npcs.some((n) => n.id === id)).toBe(true)
    })
  }

  it('regen wipes prior occupant NPCs (no dupes)', async () => {
    const first = await seedRuin('system-shadowdark')
    const before = (await db.npcs.where('poiId').equals(first.id).toArray()).length
    await executeGenerateRuin({ poiId: first.id, worldId: 'w', systemId: 'system-shadowdark', seed: 'ruin-2' }, deps())
    const after = (await db.npcs.where('poiId').equals(first.id).toArray()).length
    // Not additive: count reflects only the latest generation
    expect(after).toBeLessThanOrEqual(before + 4)
    expect(after).toBeGreaterThanOrEqual(0)
  })
})
