import type { IRealmRepository } from '@application/ports/IRealmRepository'

export async function executeDeleteRealm(
  realmId: string,
  deps: { realmRepo: IRealmRepository }
): Promise<void> {
  // TODO: cascade delete regions, factions, NPCs, events, weather, notes, etc.
  await deps.realmRepo.delete(realmId)
}
