import { db } from '@infrastructure/dexie/db'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Region } from '@domain/entities/Region'

export class RegionRepository implements IRegionRepository {
  async getById(id: string): Promise<Region | undefined> {
    return db.regions.get(id)
  }

  async getByRealmId(worldId: string): Promise<Region[]> {
    return db.regions.where('worldId').equals(worldId).toArray()
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
