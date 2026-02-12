import { db } from '@infrastructure/dexie/db'
import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableDef, TableSet } from '@domain/entities/TableDef'

export class TableRepository implements ITableRepository {
  async getTableById(id: string): Promise<TableDef | undefined> {
    return db.tableDefs.get(id)
  }

  async getTablesBySetId(setId: string): Promise<TableDef[]> {
    return db.tableDefs.where('setId').equals(setId).toArray()
  }

  async getTablesByTag(tag: string): Promise<TableDef[]> {
    return db.tableDefs.where('tags').equals(tag).toArray()
  }

  async getTablesBySystemId(systemId: string | null): Promise<TableDef[]> {
    if (systemId === null) {
      return db.tableDefs.where('systemId').equals('').toArray()
    }
    return db.tableDefs.where('systemId').equals(systemId).toArray()
  }

  async getSetById(id: string): Promise<TableSet | undefined> {
    return db.tableSets.get(id)
  }

  async getAllSets(): Promise<TableSet[]> {
    return db.tableSets.toArray()
  }

  async createTable(table: TableDef): Promise<void> {
    await db.tableDefs.put(table)
  }

  async updateTable(table: TableDef): Promise<void> {
    await db.tableDefs.put(table)
  }

  async deleteTable(id: string): Promise<void> {
    await db.tableDefs.delete(id)
  }

  async createSet(set: TableSet): Promise<void> {
    await db.tableSets.put(set)
  }

  async updateSet(set: TableSet): Promise<void> {
    await db.tableSets.put(set)
  }

  async deleteSet(id: string): Promise<void> {
    await db.tableSets.delete(id)
  }
}
