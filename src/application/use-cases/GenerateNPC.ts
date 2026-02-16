import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { NPC } from '@domain/entities/NPC'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { rollStats, rollHpForLevel, buildDefaultSystemBlock } from '@domain/services/SystemConfigService'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { runTableChain } from '@domain/services/TableChainRunner'
import { rollDice } from '@shared/dice'
import { newId } from '@shared/ulid'
import { NPC_RACES, type NPCRace } from '@shared/constants'

export interface GenerateNPCInput {
  worldId: string
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

  // Level & class for systems that support them
  const sdClasses = ['Fighter', 'Priest', 'Thief', 'Wizard'] as const
  if (systemConfig.hasLevel) {
    block.level = rollDice('1d4').total
  }
  if (systemConfig.hasClass) {
    block.className = sdClasses[Math.floor(Math.random() * sdClasses.length)]
  }

  // Roll HP (scale by level if applicable)
  const conMod = stats.find((s) => s.key === 'con')?.modifier
  const level = block.level ?? 1
  block.hp = rollHpForLevel(systemConfig, rollDice, level, conMod)
  block.maxHp = block.hp

  // Roll on all tables for this system (used for names + traits)
  const allTables = await deps.tableRepo.getTablesBySystemId(systemConfig.id)

  // Pick a random race (weighted toward human)
  const rollableRaces: NPCRace[] = ['human', 'human', 'human', 'human', 'elf', 'dwarf', 'halfling', 'half-orc', 'half-elf', 'goblin']
  const race: NPCRace = rollableRaces[Math.floor(Math.random() * rollableRaces.length)]

  // Roll name — discover tables by race + gender tags
  let name = 'Unnamed NPC'
  {
    const gender = Math.random() < 0.5 ? 'female' : 'male'
    // Try race-specific table first, fall back to generic human
    let firstNameTable = allTables.find((t) =>
      t.tags.includes('name') && t.tags.includes(gender) && t.tags.includes(race)
    )
    if (!firstNameTable) {
      firstNameTable = allTables.find((t) =>
        t.tags.includes('name') && t.tags.includes(gender) && !NPC_RACES.some((r) => t.tags.includes(r))
      )
    }
    const surnameTable = allTables.find((t) => t.tags.includes('name') && t.tags.includes('surname'))

    const nameTables = [firstNameTable, surnameTable].filter(Boolean) as typeof allTables
    if (nameTables.length > 0) {
      const chain = runTableChain(nameTables, rollDice)
      name = Object.values(chain.summary).join(' ')
    }
  }

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

  // Want — a side quest hook based on personality
  const wantParts: string[] = []
  if (vice) wantParts.push(`Needs help dealing with a problem caused by their ${vice.toLowerCase()} nature`)
  else if (virtue) wantParts.push(`Seeks someone ${virtue.toLowerCase()} enough to help with a personal matter`)
  const want = wantParts[0] ?? ''

  // Tags from physical traits
  const tags: string[] = []
  if (physique) tags.push(physique.toLowerCase())
  if (speech) tags.push(speech.toLowerCase())

  const now = Date.now()
  return {
    id: newId(),
    worldId: input.worldId,
    name,
    race,
    factionIds: input.factionId ? [input.factionId] : [],
    regionId: input.regionId ?? null,
    poiId: null,
    lifeStatus: 'alive',
    movementStatus: 'present',
    description,
    traits,
    motivation,
    appearance,
    voice,
    want,
    tags,
    imageUrl: null,
    systemBlock: block,
    createdAt: now,
    updatedAt: now,
  }
}
