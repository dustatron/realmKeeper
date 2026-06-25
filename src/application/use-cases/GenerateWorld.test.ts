import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeGenerateWorld } from './GenerateWorld'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all([db.worlds.clear(), db.gameMaps.clear(), db.factions.clear()])
})

describe('executeGenerateWorld', () => {
  it('persists a realm and a hex map, returning their ids', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Testlands', systemId: 'system-cairn-2e', seed: 'seed-1' },
      {
        realmRepo: container.realmRepo,
        factionRepo: container.factionRepo,
        realmNoteRepo: container.realmNoteRepo,
      }
    )

    const realm = await db.worlds.get(realmId)
    const map = await db.gameMaps.get(mapId)
    expect(realm?.name).toBe('Testlands')
    expect(map?.kind).toBe('hex')
    expect(map?.ownerRealmId).toBe(realmId)
    expect(map?.hexCells?.length).toBe(64)
  })

  it('is deterministic: same seed → same biome layout', async () => {
    const deps = {
      realmRepo: container.realmRepo,
      factionRepo: container.factionRepo,
      realmNoteRepo: container.realmNoteRepo,
    }
    const a = await executeGenerateWorld({ name: 'A', systemId: 'system-cairn-2e', seed: 'fixed' }, deps)
    const b = await executeGenerateWorld({ name: 'B', systemId: 'system-cairn-2e', seed: 'fixed' }, deps)
    const mapA = await db.gameMaps.get(a.mapId)
    const mapB = await db.gameMaps.get(b.mapId)
    expect(mapA?.hexCells?.map((c) => c.biome)).toEqual(mapB?.hexCells?.map((c) => c.biome))
  })
})
