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

const input = { poiId: 'poi1', name: 'Riverbend', imageUrl: '/maps/bluevale.png', width: 1193, height: 1305 }

describe('executeGetOrCreateTownMap', () => {
  it('creates an image-backed kind:town map when none exists', async () => {
    const repo = fakeRepo()
    const map = await executeGetOrCreateTownMap(input, { gameMapRepo: repo })
    expect(map.kind).toBe('town')
    expect(map.ownerPoiId).toBe('poi1')
    expect(map.imageUrl).toBe('/maps/bluevale.png')
    expect(map.width).toBe(1193)
    expect(map.height).toBe(1305)
    expect(repo.rows).toHaveLength(1)
  })

  it('returns the existing town map instead of creating a second', async () => {
    const repo = fakeRepo()
    const first = await executeGetOrCreateTownMap(input, { gameMapRepo: repo })
    const again = await executeGetOrCreateTownMap(input, { gameMapRepo: repo })
    expect(again.id).toBe(first.id)
    expect(repo.rows).toHaveLength(1)
  })

  it('backfills the backdrop onto an older imageless town map', async () => {
    const repo = fakeRepo([
      { id: 'old', ownerPoiId: 'poi1', kind: 'town', imageUrl: '', townData: { type: 'mfcg', features: [] } } as unknown as GameMap,
    ])
    const map = await executeGetOrCreateTownMap(input, { gameMapRepo: repo })
    expect(map.id).toBe('old')
    expect(map.imageUrl).toBe('/maps/bluevale.png')
    expect(map.townData).toBeNull()
    expect(repo.rows).toHaveLength(1)
  })

  it('ignores a non-town map on the same POI', async () => {
    const repo = fakeRepo([{ id: 'img1', ownerPoiId: 'poi1', kind: 'image' } as GameMap])
    const map = await executeGetOrCreateTownMap(input, { gameMapRepo: repo })
    expect(map.kind).toBe('town')
    expect(repo.rows).toHaveLength(2)
  })
})
