import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { encounterTableCreated, encounterTableUpdated, encounterTableDeleted } from '../events'
import type { EncounterTable } from '@domain/entities/EncounterTable'

export class EncounterTableRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<EncounterTable | undefined> {
    const rows = this.store.query({
      query: 'SELECT * FROM encounterTables WHERE id = $id',
      bindValues: { $id: id },
    }) as EncounterTable[]
    return rows[0] ?? undefined
  }

  async getByPoiId(poiId: string): Promise<EncounterTable | undefined> {
    const rows = this.store.query({
      query: 'SELECT * FROM encounterTables WHERE ownerPoiId = $poiId LIMIT 1',
      bindValues: { $poiId: poiId },
    }) as EncounterTable[]
    return rows[0] ?? undefined
  }

  async getByRegionId(regionId: string): Promise<EncounterTable | undefined> {
    const rows = this.store.query({
      query: 'SELECT * FROM encounterTables WHERE ownerRegionId = $regionId LIMIT 1',
      bindValues: { $regionId: regionId },
    }) as EncounterTable[]
    return rows[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<EncounterTable[]> {
    return this.store.query({
      query: 'SELECT * FROM encounterTables WHERE worldId = $worldId',
      bindValues: { $worldId: worldId },
    }) as EncounterTable[]
  }

  async create(table: EncounterTable): Promise<void> {
    this.store.commit(encounterTableCreated(table as any))
  }

  async update(table: EncounterTable): Promise<void> {
    this.store.commit(encounterTableUpdated(table as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(encounterTableDeleted({ id }))
  }
}
