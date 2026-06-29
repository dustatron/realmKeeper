import type { TableDef, TableSet } from '@domain/entities/TableDef'
import type { ResolvedTables } from '@domain/services/worldgen/TableProvider'

export interface ITableRepository {
  /**
   * Merge the static built-in tables with the user's custom Dexie tables into a
   * pure, synchronous snapshot for world generation. A Dexie table overrides a
   * built-in with the same id (live tables drive generation).
   */
  resolveAll(): Promise<ResolvedTables>
  getTableById(id: string): Promise<TableDef | undefined>
  getTablesBySetId(setId: string): Promise<TableDef[]>
  getTablesByTag(tag: string): Promise<TableDef[]>
  getTablesBySystemId(systemId: string | null): Promise<TableDef[]>
  getSetById(id: string): Promise<TableSet | undefined>
  getAllSets(): Promise<TableSet[]>
  createTable(table: TableDef): Promise<void>
  updateTable(table: TableDef): Promise<void>
  deleteTable(id: string): Promise<void>
  createSet(set: TableSet): Promise<void>
  updateSet(set: TableSet): Promise<void>
  deleteSet(id: string): Promise<void>
}
