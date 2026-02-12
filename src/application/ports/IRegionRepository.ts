import type { Region } from '@domain/entities/Region'

export interface IRegionRepository {
  getById(id: string): Promise<Region | undefined>
  getByRealmId(realmId: string): Promise<Region[]>
  create(region: Region): Promise<void>
  update(region: Region): Promise<void>
  delete(id: string): Promise<void>
}
