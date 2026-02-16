import { rollAllFactionTurns, type FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'
import { createFactionTurnRolledEvent } from '@domain/events/FactionTurnRolled'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import type { DiceResult } from '@shared/dice'

export interface ExecuteFactionTurnsDeps {
  factionRepo: IFactionRepository
  relationshipRepo: IFactionRelationshipRepository
  npcRepo: INPCRepository
  eventBus: IEventBus
  rollDice: (notation: string) => DiceResult
}

export async function executeExecuteFactionTurns(
  worldId: string,
  deps: ExecuteFactionTurnsDeps
): Promise<FactionTurnSuggestion[]> {
  const factions = await deps.factionRepo.getByRealmId(worldId)
  const npcs = await deps.npcRepo.getByRealmId(worldId)
  const factionIds = factions.map((f) => f.id)
  const relationships = await deps.relationshipRepo.getAllForRealm(worldId, factionIds)

  const suggestions = rollAllFactionTurns(factions, npcs, relationships, deps.rollDice)

  deps.eventBus.publish(createFactionTurnRolledEvent(worldId, suggestions))

  return suggestions
}
