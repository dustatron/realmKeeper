import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import { newId } from '@shared/ulid'

export async function executeInitializeRelationships(
  newFactionId: string,
  realmId: string,
  deps: {
    factionRepo: IFactionRepository
    relationshipRepo: IFactionRelationshipRepository
  }
): Promise<void> {
  const factions = await deps.factionRepo.getByRealmId(realmId)
  const others = factions.filter((f) => f.id !== newFactionId)
  const now = Date.now()

  for (const other of others) {
    // A → B
    await deps.relationshipRepo.create({
      id: newId(),
      factionId: newFactionId,
      targetId: other.id,
      score: 0,
      events: [],
      updatedAt: now,
    })
    // B → A
    await deps.relationshipRepo.create({
      id: newId(),
      factionId: other.id,
      targetId: newFactionId,
      score: 0,
      events: [],
      updatedAt: now,
    })
  }
}
