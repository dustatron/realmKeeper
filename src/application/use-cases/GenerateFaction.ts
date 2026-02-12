import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { rollDice } from '@shared/dice'
import { newId } from '@shared/ulid'

export interface GenerateFactionInput {
  realmId: string
  systemConfig: SystemConfig
}

export interface GenerateFactionResult {
  faction: Faction
  agentNpcs: NPC[]
}

export async function executeGenerateFaction(
  input: GenerateFactionInput,
  deps: { tableRepo: ITableRepository }
): Promise<GenerateFactionResult> {
  // Try to roll faction type, trait, advantage, agenda from cairn tables
  const factionTypeTables = await deps.tableRepo.getTablesByTag('faction')

  let type = ''
  let trait = ''
  let advantage = ''
  let agenda = ''

  for (const table of factionTypeTables) {
    const result = rollOnTable(table, rollDice)
    const name = table.name.toLowerCase()
    if (name.includes('type')) type = result.entry.text
    else if (name.includes('trait')) trait = result.entry.text
    else if (name.includes('advantage')) advantage = result.entry.text
    else if (name.includes('agenda')) agenda = result.entry.text
  }

  const now = Date.now()
  const factionId = newId()

  // Generate 1-3 agent NPCs
  const numAgents = rollDice('1d3').total
  const agentNpcs: NPC[] = []
  for (let i = 0; i < numAgents; i++) {
    const npc = await executeGenerateNPC(
      { realmId: input.realmId, systemConfig: input.systemConfig, factionId },
      deps
    )
    agentNpcs.push(npc)
  }

  const faction: Faction = {
    id: factionId,
    realmId: input.realmId,
    name: `${trait} ${type}`.trim() || 'New Faction',
    description: '',
    type,
    status: 'active',
    isParty: false,
    agentNpcIds: agentNpcs.map((n) => n.id),
    agendaGoals: agenda ? [{ id: newId(), description: agenda, completed: false }] : [],
    advantages: advantage ? [{ id: newId(), description: advantage }] : [],
    traits: trait ? [trait] : [],
    createdAt: now,
    updatedAt: now,
  }

  return { faction, agentNpcs }
}
