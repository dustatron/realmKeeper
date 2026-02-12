import type { INPCRepository } from '@application/ports/INPCRepository'
import type { NPC } from '@domain/entities/NPC'

export async function executeUpdateNPC(
  npc: NPC,
  deps: { npcRepo: INPCRepository }
): Promise<void> {
  await deps.npcRepo.update({ ...npc, updatedAt: Date.now() })
}
