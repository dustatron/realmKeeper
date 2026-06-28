import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'

describe('npc rumors query', () => {
  beforeEach(async () => { await db.open(); await db.rumors.clear() })
  it('finds rumors by sourceNpcId', async () => {
    await db.rumors.bulkPut([
      { id: 'r1', poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: true, hookId: null, sourceNpcId: 'npc1', tags: [], createdAt: 1, updatedAt: 1 },
      { id: 'r2', poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: true, hookId: null, sourceNpcId: 'npc2', tags: [], createdAt: 1, updatedAt: 1 },
    ] as any)
    const got = (await db.rumors.toArray()).filter((r) => r.sourceNpcId === 'npc1')
    expect(got.map((r) => r.id)).toEqual(['r1'])
  })
})
