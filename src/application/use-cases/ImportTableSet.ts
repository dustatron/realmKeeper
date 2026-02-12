import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableSetExport } from './ExportTableSet'
import { newId } from '@shared/ulid'

export async function executeImportTableSet(
  data: TableSetExport,
  deps: { tableRepo: ITableRepository }
): Promise<string> {
  const idMap = new Map<string, string>()
  const remap = (oldId: string): string => {
    if (!idMap.has(oldId)) idMap.set(oldId, newId())
    return idMap.get(oldId)!
  }

  const setId = remap(data.set.id)
  const tableIds = data.tables.map((t) => remap(t.id))

  await deps.tableRepo.createSet({
    ...data.set,
    id: setId,
    tableIds,
  })

  for (const table of data.tables) {
    await deps.tableRepo.createTable({
      ...table,
      id: remap(table.id),
      setId,
    })
  }

  return setId
}
