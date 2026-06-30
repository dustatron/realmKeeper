import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { NPCRepository } from './NPCRepository'
import type { NPC } from '@domain/entities/NPC'

const mkNpc = (id: string): NPC => ({
  id, worldId: 'w', name: id, factionIds: [], regionId: null, poiId: 'poi1',
  lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [],
  motivation: '', appearance: '', voice: '', want: '', tags: [], imageUrl: null,
  systemBlock: {} as NPC['systemBlock'], wealthTier: null, starred: false, createdAt: 1, updatedAt: 1,
})

describe('NPCRepository.bulkCreate', () => {
  beforeEach(async () => { await db.open(); await db.npcs.clear() })
  it('inserts all npcs', async () => {
    const repo = new NPCRepository()
    await repo.bulkCreate([mkNpc('a'), mkNpc('b')])
    const got = await repo.getByPoiId('poi1')
    expect(got.map((n) => n.id).sort()).toEqual(['a', 'b'])
  })
})
