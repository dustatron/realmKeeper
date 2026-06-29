import { db } from '@infrastructure/dexie/db'
import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableDef, TableSet } from '@domain/entities/TableDef'
import {
  getSystemTableById,
  getSystemTablesBySystemId,
  getSystemTablesByTag,
  getSystemTablesBySetId,
  getAllSystemSets,
  getAllSystemTables,
  getSystemSetById,
  isSystemSetId,
} from '@domain/data/system-tables'
import { createTableProvider, type ResolvedTables } from '@domain/services/worldgen/TableProvider'

export class TableRepository implements ITableRepository {
  async resolveAll(): Promise<ResolvedTables> {
    // Static built-ins first, then Dexie custom tables — createTableProvider's
    // insertion-order Map lets a custom table override a built-in with the same
    // id (live tables drive generation).
    const dbDefs = await db.tableDefs.toArray()
    return createTableProvider([...getAllSystemTables(), ...dbDefs])
  }

  async getTableById(id: string): Promise<TableDef | undefined> {
    return getSystemTableById(id) ?? db.tableDefs.get(id)
  }

  async getTablesBySetId(setId: string): Promise<TableDef[]> {
    if (isSystemSetId(setId)) return getSystemTablesBySetId(setId)
    return db.tableDefs.where('setId').equals(setId).toArray()
  }

  async getTablesByTag(tag: string): Promise<TableDef[]> {
    const systemTables = getSystemTablesByTag(tag)
    const dbTables = await db.tableDefs.where('tags').equals(tag).toArray()
    return [...systemTables, ...dbTables]
  }

  async getTablesBySystemId(systemId: string | null): Promise<TableDef[]> {
    if (systemId === null) {
      return db.tableDefs.where('systemId').equals('').toArray()
    }
    const systemTables = getSystemTablesBySystemId(systemId)
    const dbTables = await db.tableDefs.where('systemId').equals(systemId).toArray()
    return [...systemTables, ...dbTables]
  }

  async getSetById(id: string): Promise<TableSet | undefined> {
    return getSystemSetById(id) ?? db.tableSets.get(id)
  }

  async getAllSets(): Promise<TableSet[]> {
    const systemSets = getAllSystemSets()
    const dbSets = await db.tableSets.toArray()
    return [...systemSets, ...dbSets]
  }

  // Write methods — only affect DB (custom tables)

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
