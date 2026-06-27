import { describe, it, expect } from 'vitest'
import { executeGenerateLandmark } from './GenerateLandmark'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { POI } from '@domain/entities/POI'
import type { Region } from '@domain/entities/Region'

function fakePoiRepo(seed: POI[]): IPOIRepository & { rows: POI[] } {
  const rows = [...seed]
  return {
    rows,
    getById: async (id: string) => rows.find((p) => p.id === id),
    update: async (p: POI) => {
      const i = rows.findIndex((r) => r.id === p.id)
      if (i >= 0) rows[i] = p
    },
  } as unknown as IPOIRepository & { rows: POI[] }
}

function fakeRegionRepo(region: Region): IRegionRepository {
  return { getById: async () => region } as unknown as IRegionRepository
}

describe('executeGenerateLandmark', () => {
  it('saves landmarkLore and seed', async () => {
    const poi = buildPOI({ regionId: 'r1', name: 'The Cracked Bell', type: 'landmark' })
    const repo = fakePoiRepo([poi])
    const region = { id: 'r1', terrain: 'forest' } as unknown as Region
    await executeGenerateLandmark(
      { poiId: poi.id, seed: 'seed-1' },
      { poiRepo: repo, regionRepo: fakeRegionRepo(region) },
    )
    const saved = repo.rows[0]
    expect(saved.landmarkLore?.legend).toBeTruthy()
    expect(saved.poiGenOptions?.seed).toBe('seed-1')
  })

  it('returns early if POI not found', async () => {
    const repo = fakePoiRepo([])
    const region = { id: 'r1', terrain: 'forest' } as unknown as Region
    await expect(
      executeGenerateLandmark({ poiId: 'missing', seed: 'seed-1' }, { poiRepo: repo, regionRepo: fakeRegionRepo(region) }),
    ).resolves.toBeUndefined()
  })

  it('falls back to grasslands biome when region missing', async () => {
    const poi = buildPOI({ regionId: 'r1', name: 'Lost Stone', type: 'landmark' })
    const repo = fakePoiRepo([poi])
    const noRegionRepo = { getById: async () => undefined } as unknown as IRegionRepository
    await executeGenerateLandmark({ poiId: poi.id, seed: 'seed-2' }, { poiRepo: repo, regionRepo: noRegionRepo })
    const saved = repo.rows[0]
    expect(saved.landmarkLore?.legend).toBeTruthy()
    expect(saved.poiGenOptions?.seed).toBe('seed-2')
  })
})
