import { db } from '@infrastructure/dexie/db'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { POIEvent } from '@domain/entities/POIEvent'

export class POIEventRepository implements IPOIEventRepository {
  async getById(id: string): Promise<POIEvent | undefined> {
    return db.poiEvents.get(id)
  }

  async getByPoiId(poiId: string): Promise<POIEvent[]> {
    return db.poiEvents.where('poiId').equals(poiId).toArray()
  }

  async getByRealmId(realmId: string): Promise<POIEvent[]> {
    return db.poiEvents.where('realmId').equals(realmId).toArray()
  }

  async getActive(realmId: string): Promise<POIEvent[]> {
    return db.poiEvents
      .where('[realmId+isActive]')
      .equals([realmId, 1])
      .toArray()
  }

  async create(event: POIEvent): Promise<void> {
    await db.poiEvents.put(event)
  }

  async update(event: POIEvent): Promise<void> {
    await db.poiEvents.put(event)
  }

  async delete(id: string): Promise<void> {
    await db.poiEvents.delete(id)
  }
}
