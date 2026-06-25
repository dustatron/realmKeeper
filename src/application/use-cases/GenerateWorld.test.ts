import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeGenerateWorld } from './GenerateWorld'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all([db.worlds.clear(), db.gameMaps.clear(), db.factions.clear(), db.regions.clear(), db.pois.clear(), db.paths.clear()])
})

const deps = () => ({
  realmRepo: container.realmRepo,
  factionRepo: container.factionRepo,
  realmNoteRepo: container.realmNoteRepo,
})

describe('executeGenerateWorld', () => {
  it('persists a realm and a small hex map (8x8 = 64 cells), returning their ids', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Testlands', systemId: 'system-cairn-2e', seed: 'seed-1', size: 'small' },
      deps()
    )

    const realm = await db.worlds.get(realmId)
    const map = await db.gameMaps.get(mapId)
    expect(realm?.name).toBe('Testlands')
    expect(map?.kind).toBe('hex')
    expect(map?.ownerRealmId).toBe(realmId)
    expect(map?.hexCells?.length).toBe(64)
  })

  it('size controls grid dimensions: small=64, medium=144, large=256 cells', async () => {
    const small = await executeGenerateWorld({ name: 'S', systemId: 'system-cairn-2e', seed: 's', size: 'small' }, deps())
    const medium = await executeGenerateWorld({ name: 'M', systemId: 'system-cairn-2e', seed: 'm', size: 'medium' }, deps())
    const large = await executeGenerateWorld({ name: 'L', systemId: 'system-cairn-2e', seed: 'l', size: 'large' }, deps())
    expect((await db.gameMaps.get(small.mapId))?.hexCells?.length).toBe(64)
    expect((await db.gameMaps.get(medium.mapId))?.hexCells?.length).toBe(144)
    expect((await db.gameMaps.get(large.mapId))?.hexCells?.length).toBe(256)
  })

  it('persists regions and POIs linked to the realm and map', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'World', systemId: 'system-cairn-2e', seed: 'seed-1', size: 'small', poiDensity: 'normal' },
      deps()
    )
    const regions = await db.regions.where('worldId').equals(realmId).toArray()
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    expect(regions.length).toBeGreaterThan(0)
    expect(pois.length).toBeGreaterThan(0)
    const regionIds = new Set(regions.map((r) => r.id))
    for (const p of pois) expect(regionIds.has(p.regionId)).toBe(true)
  })

  it('persists paths linking generated settlements', async () => {
    const { mapId } = await executeGenerateWorld(
      { name: 'Roads', systemId: 'system-cairn-2e', seed: 'seed-paths', size: 'medium', poiDensity: 'normal' },
      deps()
    )
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    const settlementIds = new Set(pois.filter((p) => p.type === 'settlement').map((p) => p.id))
    const paths = await db.paths.toArray()
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      expect(settlementIds.has(path.fromPoiId)).toBe(true)
      expect(settlementIds.has(path.toPoiId)).toBe(true)
      expect(path.baseTravelWatches).toBeGreaterThan(0)
    }
  })

  it('is deterministic: same seed + size → same biome layout', async () => {
    const a = await executeGenerateWorld({ name: 'A', systemId: 'system-cairn-2e', seed: 'fixed', size: 'small' }, deps())
    const b = await executeGenerateWorld({ name: 'B', systemId: 'system-cairn-2e', seed: 'fixed', size: 'small' }, deps())
    const mapA = await db.gameMaps.get(a.mapId)
    const mapB = await db.gameMaps.get(b.mapId)
    expect(mapA?.hexCells?.map((c) => c.biome)).toEqual(mapB?.hexCells?.map((c) => c.biome))
  })
})
