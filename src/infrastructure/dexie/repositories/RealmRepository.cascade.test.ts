import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld } from '@application/use-cases/GenerateWorld'

const container = createContainer()

const genDeps = () => ({
  realmRepo: container.realmRepo,
  regionRepo: container.regionRepo,
  factionRepo: container.factionRepo,
  realmNoteRepo: container.realmNoteRepo,
  poiRepo: container.poiRepo,
  npcRepo: container.npcRepo,
  pathRepo: container.pathRepo,
  factionPresenceRepo: container.factionPresenceRepo,
  poiEventRepo: container.poiEventRepo,
})

// Every table that holds world-scoped data, with how to count rows for a world.
const worldIdTables = [
  'regions', 'factions', 'npcs', 'realmNotes', 'worldEvents', 'weatherHistory',
  'rollHistory', 'poiEvents', 'rumors', 'notices', 'encounterTables',
  'entityNotes', 'customCompendiumEntries', 'connections', 'hooks',
] as const

beforeEach(async () => {
  await db.open()
  await Promise.all(
    db.tables.filter((t) => t.name !== 'systemConfigs').map((t) => t.clear()),
  )
  await db.systemConfigs.put(cairnSystemConfig)
})

describe('RealmRepository cascade delete', () => {
  it('removes every child record of the deleted realm, leaving other realms intact', async () => {
    const { realmId: w1 } = await executeGenerateWorld(
      { name: 'Doomed', systemId: 'system-cairn-2e', seed: 'cascade-1', size: 'small' },
      genDeps(),
    )
    const { realmId: w2 } = await executeGenerateWorld(
      { name: 'Survivor', systemId: 'system-cairn-2e', seed: 'cascade-2', size: 'small' },
      genDeps(),
    )

    // Capture w1's child ids before deletion (regions/factions are indexed by
    // worldId; pois hang off regions; paths/maps hang off pois).
    const w1RegionIds = (await db.regions.where('worldId').equals(w1).primaryKeys()) as string[]
    const w1FactionIds = (await db.factions.where('worldId').equals(w1).primaryKeys()) as string[]
    const w1PoiIds = (await db.pois.where('regionId').anyOf(w1RegionIds).primaryKeys()) as string[]

    // Sanity: generation actually produced cross-table data for w1.
    expect(w1RegionIds.length).toBeGreaterThan(0)
    expect(w1PoiIds.length).toBeGreaterThan(0)
    expect(w1FactionIds.length).toBeGreaterThan(0)
    expect(await db.npcs.where('worldId').equals(w1).count()).toBeGreaterThan(0)

    await container.realmRepo.delete(w1)

    // The realm row itself is gone.
    expect(await db.worlds.get(w1)).toBeUndefined()

    // Every worldId-scoped table has no w1 rows left.
    for (const name of worldIdTables) {
      const left = await db.table(name).where('worldId').equals(w1).count()
      expect(left, `${name} should have no rows for deleted realm`).toBe(0)
    }

    // Indirectly-scoped tables: pois (by region), paths (by poi), relationships
    // (by faction), presences (by faction), maps (by realm/poi) — all gone.
    expect((await db.pois.bulkGet(w1PoiIds)).every((p) => p === undefined)).toBe(true)
    expect(await db.regions.bulkGet(w1RegionIds)).toEqual(w1RegionIds.map(() => undefined))
    expect(await db.factions.bulkGet(w1FactionIds)).toEqual(w1FactionIds.map(() => undefined))
    expect(await db.paths.where('fromPoiId').anyOf(w1PoiIds).count()).toBe(0)
    expect(await db.paths.where('toPoiId').anyOf(w1PoiIds).count()).toBe(0)
    expect(await db.factionRelationships.where('factionId').anyOf(w1FactionIds).count()).toBe(0)
    expect(await db.factionPresences.where('factionId').anyOf(w1FactionIds).count()).toBe(0)
    expect(await db.gameMaps.where('ownerRealmId').equals(w1).count()).toBe(0)
    if (w1PoiIds.length) {
      expect(await db.gameMaps.where('ownerPoiId').anyOf(w1PoiIds).count()).toBe(0)
    }

    // The other realm is fully intact.
    expect(await db.worlds.get(w2)).toBeDefined()
    expect(await db.regions.where('worldId').equals(w2).count()).toBeGreaterThan(0)
    expect(await db.npcs.where('worldId').equals(w2).count()).toBeGreaterThan(0)
    const w2RegionIds = (await db.regions.where('worldId').equals(w2).primaryKeys()) as string[]
    expect(await db.pois.where('regionId').anyOf(w2RegionIds).count()).toBeGreaterThan(0)
  })
})
