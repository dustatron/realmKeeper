import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { poiCreated, poiUpdated, poiDeleted } from '../events'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'

export class POIRepository implements IPOIRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<POI | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM pois WHERE id = $id', bindValues: { $id: id } }) as POI[]
    return rows[0] ?? undefined
  }

  async getByRegionId(regionId: string): Promise<POI[]> {
    return this.store.query({ query: 'SELECT * FROM pois WHERE regionId = $regionId', bindValues: { $regionId: regionId } }) as POI[]
  }

  async getByParentPoiId(parentPoiId: string | null): Promise<POI[]> {
    if (parentPoiId === null) {
      return this.store.query({ query: 'SELECT * FROM pois WHERE parentPoiId IS NULL', bindValues: {} }) as POI[]
    }
    return this.store.query({ query: 'SELECT * FROM pois WHERE parentPoiId = $parentPoiId', bindValues: { $parentPoiId: parentPoiId } }) as POI[]
  }

  async getChildren(poiId: string): Promise<POI[]> {
    return this.store.query({ query: 'SELECT * FROM pois WHERE parentPoiId = $poiId', bindValues: { $poiId: poiId } }) as POI[]
  }

  async create(poi: POI): Promise<void> {
    this.store.commit(poiCreated(poi as any))
  }

  async update(poi: POI): Promise<void> {
    this.store.commit(poiUpdated(poi as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(poiDeleted({ id }))
  }
}
