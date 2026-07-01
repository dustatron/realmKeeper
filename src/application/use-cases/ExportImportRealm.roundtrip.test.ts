import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld } from './GenerateWorld'
import { executeExportRealm } from './ExportRealm'
import { executeImportRealm } from './ImportRealm'
import type { Doom } from '@domain/entities/Doom'

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
  hookRepo: container.hookRepo,
  rumorRepo: container.rumorRepo,
  noticeRepo: container.noticeRepo,
  tableRepo: container.tableRepo,
})

const exportImportDeps = () => ({
  realmRepo: container.realmRepo,
  regionRepo: container.regionRepo,
  factionRepo: container.factionRepo,
  npcRepo: container.npcRepo,
  relationshipRepo: container.factionRelationshipRepo,
  worldEventRepo: container.worldEventRepo,
  weatherRepo: container.weatherRepo,
  realmNoteRepo: container.realmNoteRepo,
  poiRepo: container.poiRepo,
  pathRepo: container.pathRepo,
  factionPresenceRepo: container.factionPresenceRepo,
  poiEventRepo: container.poiEventRepo,
  gameMapRepo: container.gameMapRepo,
  connectionRepo: container.connectionRepo,
  hookRepo: container.hookRepo,
  doomRepo: container.doomRepo,
})

beforeEach(async () => {
  await db.open()
  await Promise.all(
    db.tables.filter((t) => t.name !== 'systemConfigs').map((t) => t.clear()),
  )
  await db.systemConfigs.put(cairnSystemConfig)
})

describe('export → import round-trip of a generated world', () => {
  it('preserves the hex overworld map (kind + cells, no corrupted image)', async () => {
    const { realmId: w1, mapId } = await executeGenerateWorld(
      { name: 'Origin', systemId: 'system-cairn-2e', seed: 'roundtrip-1', size: 'small' },
      genDeps(),
    )
    const sourceMap = await db.gameMaps.get(mapId)
    expect(sourceMap?.kind).toBe('hex')
    expect(sourceMap?.hexCells?.length).toBe(64)

    const data = await executeExportRealm(w1, exportImportDeps())
    expect(data).not.toBeNull()

    const w2 = await executeImportRealm(data!, exportImportDeps())

    const importedMaps = await db.gameMaps.where('ownerRealmId').equals(w2).toArray()
    const importedHex = importedMaps.find((m) => m.kind === 'hex')
    expect(importedHex, 'imported world should keep its hex overworld map').toBeDefined()
    expect(importedHex!.hexCells?.length).toBe(64)
    expect(importedHex!.hexCols).toBe(sourceMap!.hexCols)
    expect(importedHex!.hexRows).toBe(sourceMap!.hexRows)
    // The hex map has no image; import must not fabricate a broken data URL.
    expect(importedHex!.imageUrl).not.toContain('undefined')
  })

  it('preserves a Doom through export → import (id, status, progress, stages intact)', async () => {
    // loomingThreat:false so worldgen adds no doom; we add exactly one manually below
    const { realmId: w1 } = await executeGenerateWorld(
      { name: 'Origin', systemId: 'system-cairn-2e', seed: 'doom-roundtrip-1', size: 'small', loomingThreat: false },
      genDeps(),
    )

    const doom: Doom = {
      id: 'doom-test-1',
      worldId: w1,
      name: 'The Reckoning of the Iron Pact',
      theme: 'collapse',
      description: 'The old compact shatters.',
      doomFactionId: null,
      status: 'looming',
      progress: 3,
      segments: 6,
      stages: [{ threshold: 2, portent: 'The sky darkens.', fired: true }],
      vector: 'blight',
      keyedResource: null,
      keyedBiome: null,
      reckoningDate: { year: 1, season: 'fall', day: 7, watch: 2 },
      startDate: { year: 1, season: 'spring', day: 1, watch: 1 },
      hookId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.dooms.put(doom)

    const data = await executeExportRealm(w1, exportImportDeps())
    expect(data).not.toBeNull()
    expect(data!.dooms).toHaveLength(1)

    const w2 = await executeImportRealm(data!, exportImportDeps())

    const importedDooms = await db.dooms.where('worldId').equals(w2).toArray()
    expect(importedDooms).toHaveLength(1)
    const d = importedDooms[0]
    expect(d.status).toBe('looming')
    expect(d.progress).toBe(3)
    expect(d.stages).toHaveLength(1)
    expect(d.stages[0].portent).toBe('The sky darkens.')
    expect(d.stages[0].fired).toBe(true)
  })

  it('preserves NPC connections and quest hooks', async () => {
    const { realmId: w1 } = await executeGenerateWorld(
      { name: 'Origin', systemId: 'system-cairn-2e', seed: 'roundtrip-2', size: 'small' },
      genDeps(),
    )
    const srcConnections = await db.connections.where('worldId').equals(w1).count()
    const srcHooks = await db.hooks.where('worldId').equals(w1).count()
    expect(srcConnections).toBeGreaterThan(0)
    expect(srcHooks).toBeGreaterThan(0)

    const data = await executeExportRealm(w1, exportImportDeps())
    const w2 = await executeImportRealm(data!, exportImportDeps())

    expect(await db.connections.where('worldId').equals(w2).count()).toBe(srcConnections)
    expect(await db.hooks.where('worldId').equals(w2).count()).toBe(srcHooks)
  })
})
