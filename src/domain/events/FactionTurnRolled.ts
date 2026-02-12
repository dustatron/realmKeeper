import type { FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'

export interface FactionTurnRolledEvent {
  type: 'faction_turn_rolled'
  payload: {
    realmId: string
    suggestions: FactionTurnSuggestion[]
  }
  timestamp: number
}

export function createFactionTurnRolledEvent(
  realmId: string,
  suggestions: FactionTurnSuggestion[]
): FactionTurnRolledEvent {
  return {
    type: 'faction_turn_rolled',
    payload: { realmId, suggestions },
    timestamp: Date.now(),
  }
}
