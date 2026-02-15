import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'

export async function executeUpdateEncounterTable(
  table: EncounterTable,
  deps: { encounterTableRepo: IEncounterTableRepository }
): Promise<void> {
  await deps.encounterTableRepo.update({ ...table, updatedAt: Date.now() })
}
