import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { Faction } from '@domain/entities/Faction'

export async function executeUpdateFaction(
  faction: Faction,
  deps: { factionRepo: IFactionRepository }
): Promise<void> {
  await deps.factionRepo.update({ ...faction, updatedAt: Date.now() })
}
