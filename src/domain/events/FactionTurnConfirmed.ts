import type { FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'

export interface FactionTurnConfirmedEvent {
  type: 'faction_turn_confirmed'
  payload: {
    worldId: string
    confirmedSuggestions: FactionTurnSuggestion[]
  }
  timestamp: number
}

export function createFactionTurnConfirmedEvent(
  worldId: string,
  confirmedSuggestions: FactionTurnSuggestion[]
): FactionTurnConfirmedEvent {
  return {
    type: 'faction_turn_confirmed',
    payload: { worldId, confirmedSuggestions },
    timestamp: Date.now(),
  }
}
