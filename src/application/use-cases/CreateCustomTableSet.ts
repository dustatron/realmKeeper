import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableSet } from '@domain/entities/TableDef'
import { newId } from '@shared/ulid'

export interface CreateCustomTableSetInput {
  name: string
  systemId?: string | null
}

export async function executeCreateCustomTableSet(
  input: CreateCustomTableSetInput,
  deps: { tableRepo: ITableRepository }
): Promise<TableSet> {
  const set: TableSet = {
    id: newId(),
    name: input.name,
    source: 'custom',
    systemId: input.systemId ?? null,
    tableIds: [],
  }
  await deps.tableRepo.createSet(set)
  return set
}
