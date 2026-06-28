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
  factionRepo: c.factionRepo,
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
    db.factions.clear(),
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

  it('gives each non-party faction a seeks-item hook + HQ notice', async () => {
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

    const hq = buildPOI({ regionId: 'r1', name: 'Hall', type: 'settlement' })
    await db.pois.put(hq)

    const vault = buildPOI({ regionId: 'r1', name: 'Vault', type: 'landmark' })
    vault.treasure = [
      {
        id: 'crown1',
        name: 'Iron Crown',
        description: '',
        value: 'priceless',
        quantity: 1,
        collected: false,
        isMagic: true,
        notable: true,
      },
    ]
    await db.pois.put(vault)

    await db.npcs.put({
      id: 'leadA',
      worldId: 'w',
      name: 'Sera',
      factionIds: ['fA'],
      regionId: 'r1',
      poiId: hq.id,
      lifeStatus: 'alive',
      movementStatus: 'present',
      description: '',
      traits: [],
      motivation: '',
      appearance: '',
      voice: '',
      want: '',
      tags: [],
      imageUrl: null,
      systemBlock: { inventory: [] } as any,
      starred: false,
      createdAt: 1,
      updatedAt: 1,
    } as any)

    await db.factions.put({
      id: 'fA',
      worldId: 'w',
      name: 'Iron Order',
      description: '',
      type: 'mil',
      status: 'active',
      isParty: false,
      regionId: 'r1',
      headquartersPoiId: hq.id,
      leaderNpcId: 'leadA',
      agentNpcIds: [],
      agendaGoals: [],
      advantages: [],
      obstacles: [],
      traits: [],
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    } as any)

    await executeGenerateTreasureLeads({ worldId: 'w', seed: 'fac-leads' }, deps())

    const hooks = await db.hooks.where('worldId').equals('w').toArray()
    const seeks = hooks.find((h) => h.contactNpcId === 'leadA' && h.secret.targetType === 'item')
    expect(seeks).toBeTruthy()
    const notices = await db.notices.where('worldId').equals('w').toArray()
    expect(notices.some((n) => n.poiId === hq.id && n.hookId === seeks!.id)).toBe(true)
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
