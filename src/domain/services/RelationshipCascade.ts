import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import { clampScore } from '@domain/value-objects/RelationshipScore'

export interface RelationshipChange {
  factionId: string
  targetId: string
  delta: number
  reason: string
}

// Apply changes bidirectionally and return updated relationships
export function applyRelationshipChanges(
  relationships: FactionRelationship[],
  changes: RelationshipChange[]
): FactionRelationship[] {
  const relMap = new Map(
    relationships.map((r) => [`${r.factionId}:${r.targetId}`, { ...r }])
  )

  for (const change of changes) {
    // Forward direction
    const forwardKey = `${change.factionId}:${change.targetId}`
    const forward = relMap.get(forwardKey)
    if (forward) {
      forward.score = clampScore(forward.score + change.delta)
      forward.events = [
        ...forward.events,
        { description: change.reason, scoreDelta: change.delta, timestamp: Date.now() },
      ]
      forward.updatedAt = Date.now()
    }

    // Reverse direction (same score change)
    const reverseKey = `${change.targetId}:${change.factionId}`
    const reverse = relMap.get(reverseKey)
    if (reverse) {
      reverse.score = clampScore(reverse.score + change.delta)
      reverse.events = [
        ...reverse.events,
        { description: change.reason, scoreDelta: change.delta, timestamp: Date.now() },
      ]
      reverse.updatedAt = Date.now()
    }
  }

  return Array.from(relMap.values())
}
