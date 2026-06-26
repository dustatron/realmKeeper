import { describe, it, expect } from 'vitest'
import { executeGetOrCreateTownMap } from './GetOrCreateTownMap'
import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'

function fakeRepo(seed: GameMap[] = []): IGameMapRepository & { rows: GameMap[] } {
  const rows = [...seed]
  return {
    rows,
    getById: async (id) => rows.find((m) => m.id === id),
    getByRealmId: async () => [],
    getByPoiId: async (poiId) => rows.filter((m) => m.ownerPoiId === poiId),
    create: async (m) => { rows.push(m) },
    update: async (m) => { const i = rows.findIndex((r) => r.id === m.id); if (i >= 0) rows[i] = m },
    delete: async (id) => { const i = rows.findIndex((r) => r.id === id); if (i >= 0) rows.splice(i, 1) },
  }
}

describe('executeGetOrCreateTownMap', () => {
  it('creates a kind:town map with no image when none exists', async () => {
    const repo = fakeRepo()
    const map = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    expect(map.kind).toBe('town')
    expect(map.ownerPoiId).toBe('poi1')
    expect(map.imageUrl).toBe('')
    expect(map.width).toBeGreaterThan(0)
    expect(map.height).toBeGreaterThan(0)
    expect(repo.rows).toHaveLength(1)
  })

  it('returns the existing town map instead of creating a second', async () => {
    const repo = fakeRepo()
    const first = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    const again = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    expect(again.id).toBe(first.id)
    expect(repo.rows).toHaveLength(1)
  })

  it('ignores a non-town map on the same POI and creates the town map', async () => {
    const repo = fakeRepo([{ id: 'img1', ownerPoiId: 'poi1', kind: 'image' } as GameMap])
    const map = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    expect(map.kind).toBe('town')
    expect(repo.rows).toHaveLength(2)
  })
})
