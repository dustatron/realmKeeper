import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableDef, TableEntry } from '@domain/entities/TableDef'
import { newId } from '@shared/ulid'

export interface CreateCustomTableInput {
  setId: string
  name: string
  diceFormula: string
  entries: TableEntry[]
  tags?: string[]
  systemId?: string | null
}

export async function executeCreateCustomTable(
  input: CreateCustomTableInput,
  deps: { tableRepo: ITableRepository }
): Promise<TableDef> {
  const table: TableDef = {
    id: newId(),
    setId: input.setId,
    name: input.name,
    diceFormula: input.diceFormula,
    entries: input.entries,
    tags: input.tags ?? [],
    systemId: input.systemId ?? null,
  }
  await deps.tableRepo.createTable(table)

  // Update the parent set's tableIds
  const set = await deps.tableRepo.getSetById(input.setId)
  if (set) {
    await deps.tableRepo.updateSet({
      ...set,
      tableIds: [...set.tableIds, table.id],
    })
  }

  return table
}
