import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld } from './GenerateWorld'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all([db.worlds.clear(), db.regions.clear(), db.pois.clear(), db.npcs.clear(), db.factions.clear(), db.paths.clear()])
  await db.systemConfigs.put(cairnSystemConfig)
})

const deps = () => ({
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

describe('world gen pre-generates ruins', () => {
  it('at least one ruin has a ruinSite with areas', async () => {
    await executeGenerateWorld({ seed: 'ruin-seed', systemId: 'system-cairn-2e', name: 'T', size: 'medium' } as any, deps() as any)
    const pois = await db.pois.toArray()
    const ruins = pois.filter((p) => p.type === 'ruin')
    expect(ruins.length).toBeGreaterThan(0)
    expect(ruins.some((p) => (p.ruinSite?.areas.length ?? 0) >= 2)).toBe(true)
  })
})
