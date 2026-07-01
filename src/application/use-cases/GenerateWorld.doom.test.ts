import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld, type GenerateWorldDeps } from './GenerateWorld'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
  await db.systemConfigs.put(cairnSystemConfig)
})

const deps = (): GenerateWorldDeps => ({
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

describe('GenerateWorld doom persistence (D1)', () => {
  it('persists exactly one looming doom when loomingThreat is true', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Test', systemId: 'system-cairn-2e', seed: 'doom-persist-test', size: 'small', loomingThreat: true },
      deps(),
    )
    const dooms = await db.dooms.where('worldId').equals(realmId).toArray()
    expect(dooms).toHaveLength(1)
    expect(dooms[0].status).toBe('looming')
    expect(dooms[0].worldId).toBe(realmId)
    expect(dooms[0].progress).toBe(0)
    expect(dooms[0].segments).toBe(6)
  })

  it('persists zero doom rows when loomingThreat is false', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Test', systemId: 'system-cairn-2e', seed: 'doom-none-test', size: 'small', loomingThreat: false },
      deps(),
    )
    const dooms = await db.dooms.where('worldId').equals(realmId).toArray()
    expect(dooms).toHaveLength(0)
  })

  it('doom id is keyed to the world (worldId matches realm id)', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Test', systemId: 'system-cairn-2e', seed: 'doom-key-test', size: 'small', loomingThreat: true },
      deps(),
    )
    const dooms = await db.dooms.where('worldId').equals(realmId).toArray()
    expect(dooms[0].worldId).toBe(realmId)
    expect(typeof dooms[0].id).toBe('string')
    expect(dooms[0].id.length).toBeGreaterThan(0)
  })
})
