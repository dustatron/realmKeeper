import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { DoomRepository } from './DoomRepository'
import type { Doom } from '@domain/entities/Doom'

function makeDoom(overrides: Partial<Doom> = {}): Doom {
  return {
    id: 'doom-1',
    worldId: 'world-1',
    name: 'The Reckoning',
    theme: 'collapse',
    description: 'The end is nigh.',
    doomFactionId: null,
    status: 'looming',
    progress: 0,
    segments: 6,
    stages: [],
    vector: 'blight',
    keyedResource: null,
    keyedBiome: null,
    reckoningDate: { year: 1, season: 'spring', day: 1, watch: 1 },
    hookId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('DoomRepository', () => {
  const repo = new DoomRepository()

  beforeEach(async () => {
    await db.dooms.clear()
  })

  it('create → getById returns the doom', async () => {
    const doom = makeDoom()
    await repo.create(doom)
    const result = await repo.getById('doom-1')
    expect(result).toEqual(doom)
  })

  it('getByRealmId filters by worldId', async () => {
    await repo.create(makeDoom({ id: 'doom-1', worldId: 'world-1' }))
    await repo.create(makeDoom({ id: 'doom-2', worldId: 'world-2' }))
    const results = await repo.getByRealmId('world-1')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('doom-1')
  })

  it('update mutates the doom', async () => {
    await repo.create(makeDoom())
    await repo.update(makeDoom({ progress: 3, status: 'reckoned' }))
    const result = await repo.getById('doom-1')
    expect(result?.progress).toBe(3)
    expect(result?.status).toBe('reckoned')
  })

  it('delete removes the doom', async () => {
    await repo.create(makeDoom())
    await repo.delete('doom-1')
    const result = await repo.getById('doom-1')
    expect(result).toBeUndefined()
  })
})
