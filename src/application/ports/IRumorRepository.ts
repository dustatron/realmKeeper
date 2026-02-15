import type { Rumor } from '@domain/entities/Rumor'

export interface IRumorRepository {
  getById(id: string): Promise<Rumor | undefined>
  getByPoiId(poiId: string): Promise<Rumor[]>
  getByRegionId(regionId: string): Promise<Rumor[]>
  getByRealmId(realmId: string): Promise<Rumor[]>
  create(rumor: Rumor): Promise<void>
  update(rumor: Rumor): Promise<void>
  delete(id: string): Promise<void>
}
