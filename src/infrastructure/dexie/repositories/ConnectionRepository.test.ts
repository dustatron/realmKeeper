import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { ConnectionRepository } from './ConnectionRepository'
import type { Connection } from '@domain/entities/Connection'

const repo = new ConnectionRepository()

function make(id: string, over: Partial<Connection> = {}): Connection {
  return {
    id, worldId: 'w1',
    fromType: 'npc', fromId: 'A', toType: 'poi', toId: 'B',
    kind: 'captive_in', label: '', status: 'missing',
    hookId: null, createdAt: 1, updatedAt: 1, ...over,
  }
}

beforeEach(async () => {
  await db.open()
  await db.connections.clear()
})

describe('ConnectionRepository', () => {
  it('getByEntity returns edges touching either endpoint, de-duplicated', async () => {
    await repo.create(make('c1', { fromId: 'A', toId: 'B' }))
    await repo.create(make('c2', { fromId: 'X', toId: 'A' }))
    await repo.create(make('c3', { fromId: 'Y', toId: 'Z' }))
    const edges = await repo.getByEntity('w1', 'A')
    expect(edges.map((e) => e.id).sort()).toEqual(['c1', 'c2'])
  })

  it('bulkCreate inserts many', async () => {
    await repo.bulkCreate([make('c1'), make('c2'), make('c3')])
    expect(await db.connections.count()).toBe(3)
  })

  it('getByHook filters by hookId', async () => {
    await repo.bulkCreate([make('c1', { hookId: 'h1' }), make('c2', { hookId: 'h2' })])
    const edges = await repo.getByHook('h1')
    expect(edges).toHaveLength(1)
    expect(edges[0].id).toBe('c1')
  })

  it('delete removes an edge', async () => {
    await repo.create(make('c1'))
    await repo.delete('c1')
    expect(await db.connections.get('c1')).toBeUndefined()
  })
})
