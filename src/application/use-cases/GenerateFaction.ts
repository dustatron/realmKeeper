import type { Faction, AgendaGoal, AgendaTimeframe } from '@domain/entities/Faction'
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

/**
 * Roll unique long-term strategic goals from the faction agenda table.
 */
function rollLongTermGoals(
  tables: Awaited<ReturnType<ITableRepository['getTablesBySystemId']>>,
  count: number
): AgendaGoal[] {
  const table =
    tables.find((t) => t.id === 'table-cairn-faction-agenda') ??
    tables.find((t) => t.tags.includes('faction-agenda'))
  if (!table) return []

  const results: AgendaGoal[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (results.length < count && attempts < count * 3) {
    const text = rollOnTable(table, rollDice).entry.text
    if (!seen.has(text)) {
      seen.add(text)
      results.push({ id: newId(), description: text, completed: false, timeframe: 'long-term', progress: 0, segments: 4 })
    }
    attempts++
  }
  return results
}

/**
 * Roll unique immediate tactical goals from the d100 immediate agenda table.
 */
function rollImmediateGoals(
  tables: Awaited<ReturnType<ITableRepository['getTablesBySystemId']>>,
  count: number
): AgendaGoal[] {
  const table =
    tables.find((t) => t.id === 'table-cairn-faction-immediate-agenda') ??
    tables.find((t) => t.tags.includes('faction-immediate-agenda'))
  if (!table) return []

  const results: AgendaGoal[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (results.length < count && attempts < count * 3) {
    const text = rollOnTable(table, rollDice).entry.text
    if (!seen.has(text)) {
      seen.add(text)
      results.push({ id: newId(), description: text, completed: false, timeframe: 'immediate' })
    }
    attempts++
  }
  return results
}

/**
 * Helper to find a table by ID or name pattern among a list and roll on it.
 * Checks by ID first, then falls back to name matching, then tag matching.
 */
function findAndRoll(
  tables: Awaited<ReturnType<ITableRepository['getTablesBySystemId']>>,
  idPattern: string,
  namePattern: string,
  tagPattern: string
): string | null {
  const table =
    tables.find((t) => t.id === idPattern) ??
    tables.find((t) => t.name.toLowerCase().includes(namePattern)) ??
    tables.find((t) => t.tags.includes(tagPattern))
  if (!table) return null
  return rollOnTable(table, rollDice).entry.text
}

export async function executeGenerateFaction(
  input: GenerateFactionInput,
  deps: { tableRepo: ITableRepository }
): Promise<GenerateFactionResult> {
  // Fetch all tables for this system — most reliable approach
  const allTables = await deps.tableRepo.getTablesBySystemId(input.systemConfig.id)

  // Step 1: Roll faction TYPE
  const type = findAndRoll(allTables, 'table-cairn-faction-type', 'faction type', 'faction-type') ?? ''

  // Step 2: Roll TWO TRAITS (one from each trait table)
  const trait1 = findAndRoll(allTables, 'table-cairn-faction-trait', 'faction trait 1', 'faction-trait') ?? ''
  const trait2Table =
    allTables.find((t) => t.id === 'table-cairn-faction-trait2') ??
    allTables.find((t) => t.name.toLowerCase().includes('faction trait 2')) ??
    allTables.find((t) => t.tags.includes('faction-trait2'))
  const trait2 = trait2Table ? rollOnTable(trait2Table, rollDice).entry.text : ''
  const traits = [trait1, trait2].filter(Boolean)

  // Step 3: Roll ADVANTAGE QUANTITY (1d20 → 1-7=1, 8-12=2, 13-17=3, 18-20=4)
  const advantageCountRoll = rollDice('1d20').total
  let advantageCount: number
  if (advantageCountRoll <= 7) advantageCount = 1
  else if (advantageCountRoll <= 12) advantageCount = 2
  else if (advantageCountRoll <= 17) advantageCount = 3
  else advantageCount = 4

  // Step 4: Roll that many advantages
  const advantageTable =
    allTables.find((t) => t.id === 'table-cairn-faction-advantage') ??
    allTables.find((t) => t.name.toLowerCase().includes('faction advantage')) ??
    allTables.find((t) => t.tags.includes('faction-advantage') || t.tags.includes('advantage'))
  const advantages: Array<{ id: string; description: string }> = []
  if (advantageTable) {
    const rolledTexts = new Set<string>()
    let attempts = 0
    while (advantages.length < advantageCount && attempts < advantageCount * 3) {
      const result = rollOnTable(advantageTable, rollDice)
      if (!rolledTexts.has(result.entry.text)) {
        rolledTexts.add(result.entry.text)
        advantages.push({ id: newId(), description: result.entry.text })
      }
      attempts++
    }
  }

  // Step 5: Roll ONE OBSTACLE
  const obstacleText = findAndRoll(allTables, 'table-cairn-faction-obstacle', 'faction obstacle', 'faction-obstacle')
  const obstacles = obstacleText
    ? [{ id: newId(), description: obstacleText }]
    : []

  // Step 6a: Roll 1-2 IMMEDIATE tactical goals from d100
  const immediateCount = rollDice('1d2').total
  const immediateGoals = rollImmediateGoals(allTables, immediateCount)

  // Step 6b: Roll 2-3 distinct LONG-TERM strategic goals
  const longTermCount = rollDice('1d2').total + 1 // 2-3 goals
  const longTermGoals = rollLongTermGoals(allTables, longTermCount)

  const agendaGoals = [...immediateGoals, ...longTermGoals]

  // Step 7: Roll AGENT TYPE (stored in description for reference)
  const agentType = findAndRoll(allTables, 'table-cairn-faction-agent', 'faction agent', 'faction-agent')

  // Step 8: Generate 1-3 agent NPCs
  const now = Date.now()
  const factionId = newId()

  const numAgents = rollDice('1d3').total
  const agentNpcs: NPC[] = []
  for (let i = 0; i < numAgents; i++) {
    const npc = await executeGenerateNPC(
      { realmId: input.realmId, systemConfig: input.systemConfig, factionId },
      deps
    )
    agentNpcs.push(npc)
  }

  // Step 9: Build faction with all rolled data
  const descriptionParts: string[] = []
  if (agentType) descriptionParts.push(`Agent type: ${agentType}.`)

  const faction: Faction = {
    id: factionId,
    realmId: input.realmId,
    name: traits.length > 0 ? `${traits[0]} ${type}`.trim() : type || 'New Faction',
    description: descriptionParts.join(' '),
    type,
    status: 'active',
    isParty: false,
    regionId: null,
    headquartersPoiId: null,
    leaderNpcId: agentNpcs.length > 0 ? agentNpcs[0].id : null,
    agentNpcIds: agentNpcs.map((n) => n.id),
    agendaGoals,
    advantages,
    obstacles,
    traits,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  }

  return { faction, agentNpcs }
}
