import { describe, it, expect, beforeAll } from 'vitest'
import { db } from './db'
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'

beforeAll(async () => {
  await db.open()
})

describe('db schema v38', () => {
  it('opens at version 38', () => {
    expect(db.verno).toBe(38)
  })

  it('round-trips a Connection and queries by both endpoints', async () => {
    const c: Connection = {
      id: 'c1', worldId: 'w1',
      fromType: 'npc', fromId: 'npcA',
      toType: 'poi', toId: 'poiB',
      kind: 'captive_in', label: '', status: 'missing',
      hookId: 'h1', createdAt: 1, updatedAt: 1,
    }
    await db.connections.put(c)
    const byFrom = await db.connections.where('[worldId+fromId]').equals(['w1', 'npcA']).toArray()
    const byTo = await db.connections.where('[worldId+toId]').equals(['w1', 'poiB']).toArray()
    expect(byFrom).toHaveLength(1)
    expect(byTo).toHaveLength(1)
  })

  it('round-trips a Hook', async () => {
    const h: Hook = {
      id: 'h1', worldId: 'w1', type: 'missing_person', title: 'Find her',
      status: 'open', contactNpcId: 'npcA', rewardText: '10gp',
      secret: { kind: 'captive', targetType: 'poi', targetId: 'poiB', detail: 'in the tomb' },
      createdAt: 1, updatedAt: 1,
    }
    await db.hooks.put(h)
    expect((await db.hooks.get('h1'))?.title).toBe('Find her')
  })
})
