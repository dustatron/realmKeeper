import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { DiceResult } from '@shared/dice'

export type FactionActionType = 'nothing' | 'pursue_agenda' | 'aggressive_action'

export interface FactionTurnSuggestion {
  factionId: string
  factionName: string
  actionRoll: DiceResult
  actionType: FactionActionType
  description: string
  targetFactionId?: string
  oppositionCheck?: {
    agentNpcId: string
    agentName: string
    wilSave: DiceResult
    wilScore: number
    success: boolean
  }
  suggestedRelationshipChanges: Array<{
    factionId: string
    targetId: string
    delta: number
    reason: string
  }>
  suggestedStatusChange?: {
    factionId: string
    newStatus: string
    reason: string
  }
}

// Determine action type from d6 roll
function getActionType(roll: number): FactionActionType {
  if (roll <= 2) return 'nothing'
  if (roll <= 4) return 'pursue_agenda'
  return 'aggressive_action'
}

// Generate a narrative description based on action type and faction
function describeAction(faction: Faction, actionType: FactionActionType): string {
  const currentGoal = faction.agendaGoals.find((g) => !g.completed)
  switch (actionType) {
    case 'nothing':
      return `${faction.name} lies dormant this turn.`
    case 'pursue_agenda':
      return currentGoal
        ? `${faction.name} works toward: ${currentGoal.description}`
        : `${faction.name} consolidates its position.`
    case 'aggressive_action':
      return currentGoal
        ? `${faction.name} takes bold action toward: ${currentGoal.description}`
        : `${faction.name} makes an aggressive move.`
  }
}

// Run a single faction's turn
export function rollFactionTurn(
  faction: Faction,
  agentNpcs: NPC[],
  relationships: FactionRelationship[],
  allFactions: Faction[],
  rollDice: (notation: string) => DiceResult
): FactionTurnSuggestion {
  const actionRoll = rollDice('1d6')
  const actionType = getActionType(actionRoll.total)

  const suggestion: FactionTurnSuggestion = {
    factionId: faction.id,
    factionName: faction.name,
    actionRoll,
    actionType,
    description: describeAction(faction, actionType),
    suggestedRelationshipChanges: [],
  }

  if (actionType === 'nothing') return suggestion

  // For aggressive actions, pick the worst-relationship faction as target
  if (actionType === 'aggressive_action' && relationships.length > 0) {
    const worstRel = [...relationships].sort((a, b) => a.score - b.score)[0]
    const targetFaction = allFactions.find((f) => f.id === worstRel.targetId)

    if (targetFaction && !targetFaction.isParty) {
      suggestion.targetFactionId = targetFaction.id
      suggestion.description = `${faction.name} moves against ${targetFaction.name}.`

      // Opposition check — target's agent makes a WIL save
      const targetAgentNpcs = agentNpcs.filter((n) => targetFaction.agentNpcIds.includes(n.id))
      const targetAgent = targetAgentNpcs[0]

      if (targetAgent) {
        const wilStat = targetAgent.systemBlock.stats.find((s) => s.key === 'wil')
        const wilScore = wilStat?.value ?? 10
        const wilSave = rollDice('1d20')
        const success = wilSave.total <= wilScore

        suggestion.oppositionCheck = {
          agentNpcId: targetAgent.id,
          agentName: targetAgent.name,
          wilSave,
          wilScore,
          success,
        }

        // Suggest relationship changes
        const delta = success ? -1 : -2
        suggestion.suggestedRelationshipChanges.push({
          factionId: faction.id,
          targetId: targetFaction.id,
          delta,
          reason: success
            ? `${targetAgent.name} mitigated ${faction.name}'s aggression`
            : `${faction.name}'s aggression against ${targetFaction.name} succeeded`,
        })
      }
    }
  }

  // For pursue_agenda, no automatic relationship changes — GM decides

  return suggestion
}

// Run turns for all active non-party factions
export function rollAllFactionTurns(
  factions: Faction[],
  allNpcs: NPC[],
  relationships: FactionRelationship[],
  rollDice: (notation: string) => DiceResult
): FactionTurnSuggestion[] {
  const activeFactions = factions.filter((f) => f.status === 'active' && !f.isParty)

  return activeFactions.map((faction) => {
    const factionRels = relationships.filter((r) => r.factionId === faction.id)
    return rollFactionTurn(faction, allNpcs, factionRels, factions, rollDice)
  })
}
