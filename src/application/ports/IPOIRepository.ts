import type { POI } from '@domain/entities/POI'

export interface IPOIRepository {
  getById(id: string): Promise<POI | undefined>
  getByRegionId(regionId: string): Promise<POI[]>
  getByParentPoiId(parentPoiId: string | null): Promise<POI[]>
  getChildren(poiId: string): Promise<POI[]>
  create(poi: POI): Promise<void>
  update(poi: POI): Promise<void>
  delete(id: string): Promise<void>
}
