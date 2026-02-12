import type { INPCRepository } from '@application/ports/INPCRepository'

export async function executeDeleteNPC(
  npcId: string,
  deps: { npcRepo: INPCRepository }
): Promise<void> {
  await deps.npcRepo.delete(npcId)
}
