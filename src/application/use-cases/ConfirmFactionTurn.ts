import type { FactionTurnSuggestion, FactionActionType } from '@domain/services/FactionTurnEngine'
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

const ACTION_TYPE_LABELS: Record<FactionActionType, string> = {
  failure: 'Failure',
  setback: 'Setback',
  status_quo: 'Status Quo',
  mixed_success: 'Mixed Success',
  success: 'Success',
  major_success: 'Major Success',
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

  // Apply faction entity changes (goals, advantages, obstacles)
  for (const suggestion of suggestions) {
    if (suggestion.blocked) continue
    if (suggestion.actionType === 'status_quo') continue

    const needsUpdate =
      suggestion.suggestedGoalCompleted ||
      suggestion.suggestedAdvantageGain ||
      suggestion.suggestedAdvantageLoss ||
      suggestion.suggestedNewObstacle

    if (!needsUpdate) continue

    const faction = await deps.factionRepo.getById(suggestion.factionId)
    if (!faction) continue

    // Mark goal as completed
    if (suggestion.suggestedGoalCompleted) {
      const goal = faction.agendaGoals.find(
        (g) => !g.completed && g.description === suggestion.suggestedGoalCompleted
      )
      if (goal) {
        goal.completed = true
      }
    }

    // Gain a new advantage
    if (suggestion.suggestedAdvantageGain) {
      faction.advantages.push({
        id: newId(),
        description: suggestion.suggestedAdvantageGain,
      })
    }

    // Lose an advantage
    if (suggestion.suggestedAdvantageLoss) {
      const idx = faction.advantages.findIndex(
        (a) => a.description === suggestion.suggestedAdvantageLoss
      )
      if (idx >= 0) {
        faction.advantages.splice(idx, 1)
      } else if (faction.advantages.length > 0) {
        // No exact match -- remove first advantage
        faction.advantages.splice(0, 1)
      }
    }

    // Add new obstacle
    if (suggestion.suggestedNewObstacle) {
      faction.obstacles.push({
        id: newId(),
        description: suggestion.suggestedNewObstacle,
      })
    }

    faction.updatedAt = Date.now()
    await deps.factionRepo.update(faction)
  }

  // Create world events for each faction action
  // Skip status_quo and blocked factions
  for (const suggestion of suggestions) {
    if (suggestion.actionType === 'status_quo') continue
    if (suggestion.blocked) continue

    const event: WorldEvent = {
      id: newId(),
      realmId,
      year: date.year,
      season: date.season,
      day: date.day,
      watch: date.watch,
      type: 'faction_turn',
      title: `${suggestion.factionName}: ${ACTION_TYPE_LABELS[suggestion.actionType]}`,
      description: suggestion.description,
      relatedEntityIds: [suggestion.factionId],
      createdAt: Date.now(),
    }
    await deps.worldEventRepo.create(event)
  }

  deps.eventBus.publish(createFactionTurnConfirmedEvent(realmId, suggestions))
}
