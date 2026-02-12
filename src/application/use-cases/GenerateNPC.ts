import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { NPC } from '@domain/entities/NPC'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { rollStats, rollHp, buildDefaultSystemBlock } from '@domain/services/SystemConfigService'
import { rollOnTable } from '@domain/services/RandomTableEngine'
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
    const nameTableIds = systemConfig.namingTableIds
    // Pick a random first-name table (male or female), surname is always last
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

  // Roll on trait tables for this system
  const allTables = await deps.tableRepo.getTablesBySystemId(systemConfig.id)

  // Helper: roll on a table matching a tag, return the text or null
  const rollByTag = (tag: string): string | null => {
    const table = allTables.find((t) => t.tags.includes(tag))
    if (!table) return null
    return rollOnTable(table, rollDice).entry.text
  }

  // Appearance traits
  const physique = rollByTag('physique')
  const skin = rollByTag('skin')
  const hair = rollByTag('hair')
  const face = rollByTag('face')
  const clothing = rollByTag('clothing')

  // Build appearance string from rolled traits
  const appearanceParts = [
    physique && `${physique} build`,
    skin && `${skin.toLowerCase()} skin`,
    hair && `${hair.toLowerCase()} hair`,
    face && `${face.toLowerCase()} face`,
    clothing && `${clothing.toLowerCase()} clothing`,
  ].filter(Boolean)
  const appearance = appearanceParts.length > 0
    ? appearanceParts.join(', ')
    : ''

  // Voice/speech
  const speech = rollByTag('speech')
  const voice = speech ? `${speech} voice` : ''

  // Personality traits (virtue + vice)
  const traits: string[] = []
  const virtue = rollByTag('virtue')
  const vice = rollByTag('vice')
  if (virtue) traits.push(virtue)
  if (vice) traits.push(vice)

  // Build a description from the rolled traits
  const descParts: string[] = []
  if (physique) descParts.push(`A ${physique.toLowerCase()} figure`)
  if (face) descParts.push(`with a ${face.toLowerCase()} face`)
  if (clothing) descParts.push(`wearing ${clothing.toLowerCase()} clothing`)
  if (virtue && vice) descParts.push(`— ${virtue.toLowerCase()} yet ${vice.toLowerCase()}`)
  const description = descParts.length > 0 ? descParts.join(' ') + '.' : ''

  // Motivation from vice/virtue combo
  const motivations = [
    virtue && `Driven by ${virtue.toLowerCase()} ideals`,
    vice && `Tempered by ${vice.toLowerCase()} tendencies`,
  ].filter(Boolean)
  const motivation = motivations.join('. ')

  // Tags from physical traits
  const tags: string[] = []
  if (physique) tags.push(physique.toLowerCase())
  if (speech) tags.push(speech.toLowerCase())

  const now = Date.now()
  return {
    id: newId(),
    realmId: input.realmId,
    name,
    factionId: input.factionId ?? null,
    regionId: input.regionId ?? null,
    location: '',
    description,
    traits,
    motivation,
    appearance,
    voice,
    tags,
    systemBlock: block,
    isAlive: true,
    createdAt: now,
    updatedAt: now,
  }
}
