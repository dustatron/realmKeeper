import type { POIEvent } from '@domain/entities/POIEvent'

export interface IPOIEventRepository {
  getById(id: string): Promise<POIEvent | undefined>
  getByPoiId(poiId: string): Promise<POIEvent[]>
  getByRealmId(worldId: string): Promise<POIEvent[]>
  getActive(worldId: string): Promise<POIEvent[]>
  create(event: POIEvent): Promise<void>
  update(event: POIEvent): Promise<void>
  delete(id: string): Promise<void>
}
