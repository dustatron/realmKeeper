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
  hookRepo: container.hookRepo,
  rumorRepo: container.rumorRepo,
  noticeRepo: container.noticeRepo,
})

describe('world gen pre-generates landmarks', () => {
  it('at least one landmark has landmarkLore', async () => {
    await executeGenerateWorld(
      { seed: 'lm-seed', systemId: 'system-cairn-2e', name: 'T', size: 'small' },
      deps(),
    )
    const pois = await db.pois.toArray()
    const landmarks = pois.filter((p) => p.type === 'landmark')
    expect(landmarks.length).toBeGreaterThan(0)
    expect(landmarks.some((p) => p.landmarkLore != null)).toBe(true)
  })
})
