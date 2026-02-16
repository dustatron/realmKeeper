import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import { db } from '../db'

export class EncounterTableRepository implements IEncounterTableRepository {
  async getById(id: string): Promise<EncounterTable | undefined> {
    return db.encounterTables.get(id)
  }

  async getByPoiId(poiId: string): Promise<EncounterTable | undefined> {
    return db.encounterTables.where('ownerPoiId').equals(poiId).first()
  }

  async getByRegionId(regionId: string): Promise<EncounterTable | undefined> {
    return db.encounterTables.where('ownerRegionId').equals(regionId).first()
  }

  async getByRealmId(worldId: string): Promise<EncounterTable[]> {
    return db.encounterTables.where('worldId').equals(worldId).toArray()
  }

  async create(table: EncounterTable): Promise<void> {
    await db.encounterTables.put(table)
  }

  async update(table: EncounterTable): Promise<void> {
    await db.encounterTables.put(table)
  }

  async delete(id: string): Promise<void> {
    await db.encounterTables.delete(id)
  }
}
