import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import { clampScore } from '@domain/value-objects/RelationshipScore'

export async function executeUpdateRelationship(
  factionId: string,
  targetId: string,
  delta: number,
  reason: string,
  deps: { relationshipRepo: IFactionRelationshipRepository }
): Promise<void> {
  const now = Date.now()

  // Forward
  const forward = await deps.relationshipRepo.getPair(factionId, targetId)
  if (forward) {
    await deps.relationshipRepo.update({
      ...forward,
      score: clampScore(forward.score + delta),
      events: [...forward.events, { description: reason, scoreDelta: delta, timestamp: now }],
      updatedAt: now,
    })
  }

  // Reverse
  const reverse = await deps.relationshipRepo.getPair(targetId, factionId)
  if (reverse) {
    await deps.relationshipRepo.update({
      ...reverse,
      score: clampScore(reverse.score + delta),
      events: [...reverse.events, { description: reason, scoreDelta: delta, timestamp: now }],
      updatedAt: now,
    })
  }
}
