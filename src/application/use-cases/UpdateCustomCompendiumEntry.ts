import type { ICustomCompendiumRepository } from '@application/ports/ICustomCompendiumRepository'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'

export async function executeUpdateCustomCompendiumEntry(
  entry: CustomCompendiumEntry,
  deps: { customCompendiumRepo: ICustomCompendiumRepository }
): Promise<void> {
  await deps.customCompendiumRepo.update({ ...entry, updatedAt: Date.now() })
}
