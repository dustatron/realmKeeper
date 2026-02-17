import type { ICustomCompendiumRepository } from '@application/ports/ICustomCompendiumRepository'

export async function executeDeleteCustomCompendiumEntry(
  id: string,
  deps: { customCompendiumRepo: ICustomCompendiumRepository }
): Promise<void> {
  await deps.customCompendiumRepo.delete(id)
}
