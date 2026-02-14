import type { POIEvent } from '@domain/entities/POIEvent'

export interface IPOIEventRepository {
  getById(id: string): Promise<POIEvent | undefined>
  getByPoiId(poiId: string): Promise<POIEvent[]>
  getByRealmId(realmId: string): Promise<POIEvent[]>
  getActive(realmId: string): Promise<POIEvent[]>
  create(event: POIEvent): Promise<void>
  update(event: POIEvent): Promise<void>
  delete(id: string): Promise<void>
}
