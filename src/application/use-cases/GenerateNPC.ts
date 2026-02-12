import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { NPC } from '@domain/entities/NPC'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { rollStats, rollHp, buildDefaultSystemBlock } from '@domain/services/SystemConfigService'
import { runTableChain } from '@domain/services/TableChainRunner'
import { rollDice } from '@shared/dice'
import { newId } from '@shared/ulid'

export interface GenerateNPCInput {
  realmId: string
  systemConfig: SystemConfig
  factionId?: string
  regionId?: string
}

export interface GenerateNPCDeps {
  tableRepo: ITableRepository
}

export async function executeGenerateNPC(
  input: GenerateNPCInput,
  deps: GenerateNPCDeps
): Promise<NPC> {
  const { systemConfig } = input

  // Roll stats
  const stats = rollStats(systemConfig, rollDice)
  const block = buildDefaultSystemBlock(systemConfig)
  block.stats = stats

  // Roll HP
  const conMod = stats.find((s) => s.key === 'con')?.modifier
  block.hp = rollHp(systemConfig, rollDice, conMod)
  block.maxHp = block.hp

  // Roll name from naming tables
  let name = 'Unnamed NPC'
  if (systemConfig.namingTableIds.length > 0) {
    // Pick a random naming table (e.g. randomly choose male or female names)
    const nameTableIds = systemConfig.namingTableIds
    // Roll on first name table + surname table (if available)
    const firstNameTableId =
      nameTableIds[Math.floor(Math.random() * Math.min(nameTableIds.length - 1, nameTableIds.length))]
    const surnameTableId = nameTableIds.length > 1 ? nameTableIds[nameTableIds.length - 1] : null

    const tableIds = surnameTableId ? [firstNameTableId, surnameTableId] : [firstNameTableId]
    const tables = await Promise.all(tableIds.map((id) => deps.tableRepo.getTableById(id)))
    const validTables = tables.filter((t): t is NonNullable<typeof t> => t != null)

    if (validTables.length > 0) {
      const chain = runTableChain(validTables, rollDice)
      name = Object.values(chain.summary).join(' ')
    }
  }

  // Roll traits if trait tables exist
  const traits: string[] = []
  // Look for trait tables in the system's table sets
  // For now, keep traits empty — the UI can add them

  const now = Date.now()
  return {
    id: newId(),
    realmId: input.realmId,
    name,
    factionId: input.factionId ?? null,
    regionId: input.regionId ?? null,
    description: '',
    traits,
    motivation: '',
    appearance: '',
    voice: '',
    tags: [],
    systemBlock: block,
    isAlive: true,
    createdAt: now,
    updatedAt: now,
  }
}
