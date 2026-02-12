import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { DiceResult } from '@shared/dice'

export type FactionActionType = 'failure' | 'setback' | 'status_quo' | 'mixed_success' | 'success' | 'major_success'

export interface FactionTurnSuggestion {
  factionId: string
  factionName: string
  actionRoll: DiceResult
  actionType: FactionActionType
  description: string
  blocked?: boolean
  oppositionCheck?: {
    agentNpcId: string
    agentName: string
    wilSave: DiceResult
    wilScore: number
    success: boolean  // true = save succeeded = faction is BLOCKED
  }
  suggestedGoalCompleted?: string
  suggestedAdvantageGain?: string
  suggestedAdvantageLoss?: string
  suggestedNewObstacle?: string
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

// Cairn 2e Faction Actions table (d6)
function getActionType(roll: number): FactionActionType {
  switch (roll) {
    case 1: return 'failure'
    case 2: return 'setback'
    case 3: return 'status_quo'
    case 4: return 'mixed_success'
    case 5: return 'success'
    case 6: return 'major_success'
    default: return 'status_quo'
  }
}

// Generate a narrative description based on action type and faction
function describeAction(faction: Faction, actionType: FactionActionType): string {
  const currentGoal = faction.agendaGoals.find((g) => !g.completed)
  const goalText = currentGoal ? currentGoal.description : 'their current position'

  switch (actionType) {
    case 'failure':
      return `${faction.name} suffers a failure. A new obstacle emerges and an advantage is lost.`
    case 'setback':
      return `${faction.name} experiences a setback and loses an advantage.`
    case 'status_quo':
      return `${faction.name} makes no meaningful progress this turn.`
    case 'mixed_success':
      return `${faction.name} achieves progress toward ${goalText}, but loses an advantage in the process.`
    case 'success':
      return `${faction.name} successfully advances toward ${goalText}.`
    case 'major_success':
      return `${faction.name} achieves a major success toward ${goalText} and gains a new advantage!`
  }
}

// Find the opposing faction: worst relationship that is negative
function findOpposingFaction(
  faction: Faction,
  relationships: FactionRelationship[],
  allFactions: Faction[]
): Faction | null {
  // Only consider negative relationships
  const negativeRels = relationships.filter((r) => r.score < 0)
  if (negativeRels.length === 0) return null

  // Sort by score ascending (worst first)
  const worst = [...negativeRels].sort((a, b) => a.score - b.score)[0]
  const opposingFaction = allFactions.find((f) => f.id === worst.targetId)

  if (!opposingFaction) return null
  // Don't use party faction as opposition source
  if (opposingFaction.isParty) return null
  // Only active factions can oppose
  if (opposingFaction.status !== 'active') return null

  return opposingFaction
}

// Run a single faction's turn (Cairn 2e rules)
export function rollFactionTurn(
  faction: Faction,
  agentNpcs: NPC[],
  relationships: FactionRelationship[],
  allFactions: Faction[],
  rollDice: (notation: string) => DiceResult
): FactionTurnSuggestion {
  // Step 1: Find opposing faction (worst negative relationship)
  const opposingFaction = findOpposingFaction(faction, relationships, allFactions)

  // Step 2: Opposition check BEFORE action roll
  if (opposingFaction) {
    const opponentAgentNpcs = agentNpcs.filter((n) =>
      opposingFaction.agentNpcIds.includes(n.id)
    )
    const opponentAgent = opponentAgentNpcs[0]

    if (opponentAgent) {
      const wilStat = opponentAgent.systemBlock.stats.find((s) => s.key === 'wil')
      const wilScore = wilStat?.value ?? 10
      const wilSave = rollDice('1d20')
      const saveSucceeded = wilSave.total <= wilScore

      if (saveSucceeded) {
        // Faction is BLOCKED -- no action roll
        return {
          factionId: faction.id,
          factionName: faction.name,
          actionRoll: wilSave, // use the WIL save as the "roll" for display
          actionType: 'status_quo',
          description: `${faction.name} is blocked by ${opposingFaction.name}! ${opponentAgent.name} successfully opposes their efforts.`,
          blocked: true,
          oppositionCheck: {
            agentNpcId: opponentAgent.id,
            agentName: opponentAgent.name,
            wilSave,
            wilScore,
            success: true,
          },
          suggestedRelationshipChanges: [],
        }
      }

      // Save failed -- faction proceeds but record the check
      // We'll attach the opposition check to the suggestion below
      const actionRoll = rollDice('1d6')
      const actionType = getActionType(actionRoll.total)
      const suggestion = buildSuggestion(faction, actionRoll, actionType)
      suggestion.oppositionCheck = {
        agentNpcId: opponentAgent.id,
        agentName: opponentAgent.name,
        wilSave,
        wilScore,
        success: false,
      }
      return suggestion
    }
  }

  // Step 3: No opposition -- roll normally
  const actionRoll = rollDice('1d6')
  const actionType = getActionType(actionRoll.total)
  return buildSuggestion(faction, actionRoll, actionType)
}

// Build a suggestion based on action type
function buildSuggestion(
  faction: Faction,
  actionRoll: DiceResult,
  actionType: FactionActionType
): FactionTurnSuggestion {
  const suggestion: FactionTurnSuggestion = {
    factionId: faction.id,
    factionName: faction.name,
    actionRoll,
    actionType,
    description: describeAction(faction, actionType),
    suggestedRelationshipChanges: [],
  }

  const currentGoal = faction.agendaGoals.find((g) => !g.completed)
  const firstAdvantage = faction.advantages[0]

  switch (actionType) {
    case 'failure':
      suggestion.suggestedNewObstacle = `A new obstacle threatens ${faction.name}'s plans`
      if (firstAdvantage) {
        suggestion.suggestedAdvantageLoss = firstAdvantage.description
      }
      break

    case 'setback':
      if (firstAdvantage) {
        suggestion.suggestedAdvantageLoss = firstAdvantage.description
      }
      break

    case 'status_quo':
      // Nothing changes
      break

    case 'mixed_success':
      if (currentGoal) {
        suggestion.suggestedGoalCompleted = currentGoal.description
      }
      if (firstAdvantage) {
        suggestion.suggestedAdvantageLoss = firstAdvantage.description
      }
      break

    case 'success':
      if (currentGoal) {
        suggestion.suggestedGoalCompleted = currentGoal.description
      }
      break

    case 'major_success':
      if (currentGoal) {
        suggestion.suggestedGoalCompleted = currentGoal.description
      }
      suggestion.suggestedAdvantageGain = `${faction.name} gains a strategic advantage`
      break
  }

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
