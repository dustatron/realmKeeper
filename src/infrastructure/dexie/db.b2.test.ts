import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { RumorRepository } from './repositories/RumorRepository'

describe('B2 dexie', () => {
  beforeEach(async () => { await db.open(); await db.rumors.clear() })
  it('legacy rumor reads back sourceNpcId null', async () => {
    const legacy: any = { id: 'r1', poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: false, hookId: null, tags: [], createdAt: 1, updatedAt: 1 }
    await db.rumors.put(legacy)
    const read = await db.rumors.get('r1')
    expect(read?.sourceNpcId ?? null).toBeNull()
  })
  it('rumor bulkCreate inserts all', async () => {
    const repo = new RumorRepository()
    const mk = (id: string): any => ({ id, poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: false, hookId: null, sourceNpcId: null, tags: [], createdAt: 1, updatedAt: 1 })
    await repo.bulkCreate([mk('a'), mk('b')])
    expect((await repo.getByRealmId('w')).length).toBe(2)
  })
})
