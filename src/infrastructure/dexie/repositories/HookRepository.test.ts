import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { HookRepository } from './HookRepository'
import type { Hook } from '@domain/entities/Hook'

const repo = new HookRepository()

function make(id: string, over: Partial<Hook> = {}): Hook {
  return {
    id, worldId: 'w1', type: 'missing_person', title: 't',
    status: 'open', contactNpcId: 'A', rewardText: '',
    secret: { kind: 'captive', targetType: 'poi', targetId: 'B', detail: '' },
    createdAt: 1, updatedAt: 1, ...over,
  }
}

beforeEach(async () => {
  await db.open()
  await db.hooks.clear()
})

describe('HookRepository', () => {
  it('create + getById round-trips, preserving the structured secret', async () => {
    await repo.create(make('h1', { secret: { kind: 'captive', targetType: 'poi', targetId: 'B', detail: 'tomb' } }))
    const got = await repo.getById('h1')
    expect(got?.secret.targetId).toBe('B')
    expect(got?.secret.detail).toBe('tomb')
  })

  it('getByWorld returns only that world', async () => {
    await repo.bulkCreate([make('h1', { worldId: 'w1' }), make('h2', { worldId: 'w2' })])
    const got = await repo.getByWorld('w1')
    expect(got.map((h) => h.id)).toEqual(['h1'])
  })

  it('delete removes a hook', async () => {
    await repo.create(make('h1'))
    await repo.delete('h1')
    expect(await repo.getById('h1')).toBeUndefined()
  })
})
