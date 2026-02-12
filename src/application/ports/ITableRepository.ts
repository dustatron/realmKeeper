import type { TableDef, TableSet } from '@domain/entities/TableDef'

export interface ITableRepository {
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
