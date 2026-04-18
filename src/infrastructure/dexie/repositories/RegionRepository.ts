import { db } from '@infrastructure/dexie/db'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Region } from '@domain/entities/Region'

function normalize(r: Region): Region {
  return { ...r, people: r.people ?? [] }
}

export class RegionRepository implements IRegionRepository {
  async getById(id: string): Promise<Region | undefined> {
    const r = await db.regions.get(id)
    return r ? normalize(r) : undefined
  }

  async getByRealmId(worldId: string): Promise<Region[]> {
    const rows = await db.regions.where('worldId').equals(worldId).toArray()
    return rows.map(normalize)
  }

  async create(region: Region): Promise<void> {
    await db.regions.put(region)
  }

  async update(region: Region): Promise<void> {
    await db.regions.put(region)
  }

  async delete(id: string): Promise<void> {
    await db.regions.delete(id)
  }
}
