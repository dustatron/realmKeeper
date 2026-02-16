import type { INPCRepository } from '@application/ports/INPCRepository'

export async function executeLinkNPCToFaction(
  npcId: string,
  factionId: string,
  deps: { npcRepo: INPCRepository }
): Promise<void> {
  const npc = await deps.npcRepo.getById(npcId)
  if (!npc) return
  if (npc.factionIds.includes(factionId)) return
  await deps.npcRepo.update({
    ...npc,
    factionIds: [...npc.factionIds, factionId],
    updatedAt: Date.now(),
  })
}

export async function executeUnlinkNPCFromFaction(
  npcId: string,
  factionId: string,
  deps: { npcRepo: INPCRepository }
): Promise<void> {
  const npc = await deps.npcRepo.getById(npcId)
  if (!npc) return
  await deps.npcRepo.update({
    ...npc,
    factionIds: npc.factionIds.filter((id) => id !== factionId),
    updatedAt: Date.now(),
  })
}
