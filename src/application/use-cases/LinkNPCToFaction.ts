import type { INPCRepository } from '@application/ports/INPCRepository'

export async function executeLinkNPCToFaction(
  npcId: string,
  factionId: string | null,
  deps: { npcRepo: INPCRepository }
): Promise<void> {
  const npc = await deps.npcRepo.getById(npcId)
  if (!npc) return
  await deps.npcRepo.update({ ...npc, factionId, updatedAt: Date.now() })
}
