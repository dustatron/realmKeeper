import { db } from '@infrastructure/dexie/db'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'

export class POIRepository implements IPOIRepository {
  async getById(id: string): Promise<POI | undefined> {
    return db.pois.get(id)
  }

  async getByRegionId(regionId: string): Promise<POI[]> {
    return db.pois.where('regionId').equals(regionId).toArray()
  }

  async getByParentPoiId(parentPoiId: string | null): Promise<POI[]> {
    if (parentPoiId === null) {
      return db.pois.where('parentPoiId').equals('').toArray()
    }
    return db.pois.where('parentPoiId').equals(parentPoiId).toArray()
  }

  async getChildren(poiId: string): Promise<POI[]> {
    return db.pois.where('parentPoiId').equals(poiId).toArray()
  }

  async create(poi: POI): Promise<void> {
    await db.pois.put(poi)
  }

  async update(poi: POI): Promise<void> {
    await db.pois.put(poi)
  }

  async delete(id: string): Promise<void> {
    await db.pois.delete(id)
  }

  async getByMapRef(mapRef: string): Promise<POI[]> {
    return db.pois.where('mapRef').equals(mapRef).toArray()
  }
}
