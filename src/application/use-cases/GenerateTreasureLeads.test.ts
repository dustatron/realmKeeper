import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeGenerateTreasureLeads } from './GenerateTreasureLeads'

const c = createContainer()
const deps = () => ({
  poiRepo: c.poiRepo,
  npcRepo: c.npcRepo,
  regionRepo: c.regionRepo,
  hookRepo: c.hookRepo,
  rumorRepo: c.rumorRepo,
  noticeRepo: c.noticeRepo,
})

beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.pois.clear(),
    db.npcs.clear(),
    db.regions.clear(),
    db.hooks.clear(),
    db.rumors.clear(),
    db.notices.clear(),
  ])
})

describe('executeGenerateTreasureLeads', () => {
  it('creates item-targeted hooks + projections for notable finds', async () => {
    // Seed region so POI iteration works
    await db.regions.put({
      id: 'r1',
      worldId: 'w',
      name: 'Test Region',
      description: '',
      terrain: 'forest',
      features: [],
      dangers: [],
      settlements: [],
      resources: [],
      people: [],
      boundary: null,
      color: null,
      imageUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const town = buildPOI({ regionId: 'r1', name: 'Town', type: 'settlement' })
    await db.pois.put(town)

    const vault = buildPOI({ regionId: 'r1', name: 'Vault', type: 'landmark' })
    vault.treasure = [
      {
        id: 'itm1',
        name: 'Sun Blade',
        description: '',
        value: 'priceless',
        quantity: 1,
        collected: false,
        isMagic: true,
        notable: true,
      },
    ]
    await db.pois.put(vault)

    await executeGenerateTreasureLeads({ worldId: 'w', seed: 'leads-1' }, deps())

    const hooks = await db.hooks.where('worldId').equals('w').toArray()
    const itemHook = hooks.find((h) => h.secret.targetType === 'item' && h.secret.targetId === 'itm1')
    expect(itemHook).toBeTruthy()
    expect(itemHook!.secret.containerType).toBe('poi')
    expect(itemHook!.secret.containerId).toBe(vault.id)

    const rumorsAndNotices = [...(await db.rumors.toArray()), ...(await db.notices.toArray())]
    expect(rumorsAndNotices.some((x) => x.hookId === itemHook!.id)).toBe(true)
  })

  it('returns early when no notable/magic targets exist', async () => {
    await db.regions.put({
      id: 'r1',
      worldId: 'w',
      name: 'Empty Region',
      description: '',
      terrain: 'plains',
      features: [],
      dangers: [],
      settlements: [],
      resources: [],
      people: [],
      boundary: null,
      color: null,
      imageUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const town = buildPOI({ regionId: 'r1', name: 'Quiet Town', type: 'settlement' })
    await db.pois.put(town)

    await executeGenerateTreasureLeads({ worldId: 'w', seed: 'leads-empty' }, deps())

    const hooks = await db.hooks.where('worldId').equals('w').toArray()
    expect(hooks).toHaveLength(0)
  })
})
