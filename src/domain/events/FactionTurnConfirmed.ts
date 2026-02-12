import type { FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'

export interface FactionTurnConfirmedEvent {
  type: 'faction_turn_confirmed'
  payload: {
    realmId: string
    confirmedSuggestions: FactionTurnSuggestion[]
  }
  timestamp: number
}

export function createFactionTurnConfirmedEvent(
  realmId: string,
  confirmedSuggestions: FactionTurnSuggestion[]
): FactionTurnConfirmedEvent {
  return {
    type: 'faction_turn_confirmed',
    payload: { realmId, confirmedSuggestions },
    timestamp: Date.now(),
  }
}
