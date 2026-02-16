import type { FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'

export interface FactionTurnRolledEvent {
  type: 'faction_turn_rolled'
  payload: {
    worldId: string
    suggestions: FactionTurnSuggestion[]
  }
  timestamp: number
}

export function createFactionTurnRolledEvent(
  worldId: string,
  suggestions: FactionTurnSuggestion[]
): FactionTurnRolledEvent {
  return {
    type: 'faction_turn_rolled',
    payload: { worldId, suggestions },
    timestamp: Date.now(),
  }
}
