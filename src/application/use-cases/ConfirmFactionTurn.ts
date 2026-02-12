import type { FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'
import { applyRelationshipChanges } from '@domain/services/RelationshipCascade'
import { createFactionTurnConfirmedEvent } from '@domain/events/FactionTurnConfirmed'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { Season, Watch } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface ConfirmFactionTurnDeps {
  factionRepo: IFactionRepository
  relationshipRepo: IFactionRelationshipRepository
  worldEventRepo: IWorldEventRepository
  eventBus: IEventBus
}

export async function executeConfirmFactionTurn(
  realmId: string,
  suggestions: FactionTurnSuggestion[],
  date: { year: number; season: Season; day: number; watch: Watch },
  deps: ConfirmFactionTurnDeps
): Promise<void> {
  // Collect all relationship changes
  const allChanges = suggestions.flatMap((s) => s.suggestedRelationshipChanges)

  if (allChanges.length > 0) {
    // Get current relationships
    const factions = await deps.factionRepo.getByRealmId(realmId)
    const factionIds = factions.map((f) => f.id)
    const relationships = await deps.relationshipRepo.getAllForRealm(realmId, factionIds)

    // Apply changes
    const updated = applyRelationshipChanges(relationships, allChanges)

    // Persist each updated relationship
    for (const rel of updated) {
      await deps.relationshipRepo.update(rel)
    }
  }

  // Create world events for each faction action
  for (const suggestion of suggestions) {
    if (suggestion.actionType === 'nothing') continue

    const event: WorldEvent = {
      id: newId(),
      realmId,
      year: date.year,
      season: date.season,
      day: date.day,
      watch: date.watch,
      type: 'faction_turn',
      title: `${suggestion.factionName}: ${suggestion.actionType === 'pursue_agenda' ? 'Pursues Agenda' : 'Aggressive Action'}`,
      description: suggestion.description,
      relatedEntityIds: [suggestion.factionId, ...(suggestion.targetFactionId ? [suggestion.targetFactionId] : [])],
      createdAt: Date.now(),
    }
    await deps.worldEventRepo.create(event)
  }

  deps.eventBus.publish(createFactionTurnConfirmedEvent(realmId, suggestions))
}
