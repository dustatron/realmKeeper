import type { EncounterTable } from '@domain/entities/EncounterTable'

export interface IEncounterTableRepository {
  getById(id: string): Promise<EncounterTable | undefined>
  getByPoiId(poiId: string): Promise<EncounterTable | undefined>
  getByRegionId(regionId: string): Promise<EncounterTable | undefined>
  getByRealmId(realmId: string): Promise<EncounterTable[]>
  create(table: EncounterTable): Promise<void>
  update(table: EncounterTable): Promise<void>
  delete(id: string): Promise<void>
}
