import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'

export async function executeDeleteFactionPresence(
  presenceId: string,
  deps: { factionPresenceRepo: IFactionPresenceRepository }
): Promise<void> {
  await deps.factionPresenceRepo.delete(presenceId)
}
