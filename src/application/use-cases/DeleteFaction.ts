import type { IFactionRepository } from '@application/ports/IFactionRepository'

export async function executeDeleteFaction(
  factionId: string,
  deps: { factionRepo: IFactionRepository }
): Promise<void> {
  await deps.factionRepo.delete(factionId)
}
