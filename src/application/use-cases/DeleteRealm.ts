import type { IRealmRepository } from '@application/ports/IRealmRepository'

export async function executeDeleteRealm(
  worldId: string,
  deps: { realmRepo: IRealmRepository }
): Promise<void> {
  // TODO: cascade delete regions, factions, NPCs, events, weather, notes, etc.
  await deps.realmRepo.delete(worldId)
}
