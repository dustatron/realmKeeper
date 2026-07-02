import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeRegenerateRegionEncounter } from './RegenerateRegionEncounter'

const c = createContainer()
const deps = () => ({ encounterTableRepo: c.encounterTableRepo, poiRepo: c.poiRepo, factionRepo: c.factionRepo, regionRepo: c.regionRepo })

beforeEach(async () => {
  await db.open()
  await Promise.all([db.regions.clear(), db.pois.clear(), db.factions.clear(), db.encounterTables.clear()])
})

describe('executeRegenerateRegionEncounter', () => {
  it('builds + persists a region encounter table from its POIs', async () => {
    await db.regions.put({ id: 'r1', worldId: 'w', terrain: 'mountains' } as any)
    const lair = buildPOI({ regionId: 'r1', name: 'The Black Vault', type: 'dungeon' })
    await db.pois.put(lair)

    const t = await executeRegenerateRegionEncounter(
      { regionId: 'r1', worldId: 'w', systemId: 'system-cairn-2e', seed: 's' },
      deps(),
    )

    expect(t.ownerRegionId).toBe('r1')
    expect(t.creature.length).toBeGreaterThan(0)
    expect(t.signOmen.some((d) => d.includes('The Black Vault'))).toBe(true)
    expect(t.lastResult).toBeNull()

    // persisted
    const fromDb = await db.encounterTables.where('ownerRegionId').equals('r1').first()
    expect(fromDb?.creature.length).toBeGreaterThan(0)
  })

  it('updates existing table on re-run without duplicating', async () => {
    await db.regions.put({ id: 'r2', worldId: 'w', terrain: 'forest' } as any)

    const t1 = await executeRegenerateRegionEncounter(
      { regionId: 'r2', worldId: 'w', systemId: 'system-cairn-2e', seed: 'a' },
      deps(),
    )
    const t2 = await executeRegenerateRegionEncounter(
      { regionId: 'r2', worldId: 'w', systemId: 'system-cairn-2e', seed: 'b' },
      deps(),
    )

    expect(t2.id).toBe(t1.id)
    const rows = await db.encounterTables.where('ownerRegionId').equals('r2').toArray()
    expect(rows.length).toBe(1)
    expect(t2.lastResult).toBeNull()
  })

  it('throws when region not found', async () => {
    await expect(
      executeRegenerateRegionEncounter(
        { regionId: 'missing', worldId: 'w', systemId: 'system-cairn-2e' },
        deps(),
      ),
    ).rejects.toThrow('Region not found')
  })
})
