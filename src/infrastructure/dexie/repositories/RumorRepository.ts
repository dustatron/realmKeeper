import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { Rumor } from '@domain/entities/Rumor'
import { db } from '../db'

export class RumorRepository implements IRumorRepository {
  async getById(id: string): Promise<Rumor | undefined> {
    return db.rumors.get(id)
  }

  async getByPoiId(poiId: string): Promise<Rumor[]> {
    return db.rumors.where('poiId').equals(poiId).toArray()
  }

  async getByRegionId(regionId: string): Promise<Rumor[]> {
    return db.rumors.where('regionId').equals(regionId).toArray()
  }

  async getByRealmId(realmId: string): Promise<Rumor[]> {
    return db.rumors.where('realmId').equals(realmId).toArray()
  }

  async create(rumor: Rumor): Promise<void> {
    await db.rumors.put(rumor)
  }

  async update(rumor: Rumor): Promise<void> {
    await db.rumors.put(rumor)
  }

  async delete(id: string): Promise<void> {
    await db.rumors.delete(id)
  }
}
