import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableDef, TableSet } from '@domain/entities/TableDef'

export interface TableSetExport {
  version: 1
  exportedAt: number
  set: TableSet
  tables: TableDef[]
}

export async function executeExportTableSet(
  setId: string,
  deps: { tableRepo: ITableRepository }
): Promise<TableSetExport | null> {
  const set = await deps.tableRepo.getSetById(setId)
  if (!set) return null
  const tables = await deps.tableRepo.getTablesBySetId(setId)
  return { version: 1, exportedAt: Date.now(), set, tables }
}
