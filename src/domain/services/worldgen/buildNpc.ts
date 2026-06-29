import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { NPC } from '@domain/entities/NPC'
import {
  rollStats,
  rollHpForLevel,
  buildDefaultSystemBlock,
} from '@domain/services/SystemConfigService'
import { newId } from '@shared/ulid'
import { pickCairn } from './cairnPick'
import { makeSeededDice } from './seededDice'
import { pickNpcWant } from '@domain/data/worldgen/npcWants'
import { buildHumanoidFlavor } from './npcFactory'
import type { ResolvedTables } from './TableProvider'
import { NPC_FAVOR_TABLE_ID, NPC_PURSUIT_TABLE_ID, NPC_FLAW_TABLE_ID, NPC_FLAWS } from '@domain/data/worldgen/npc.tables'

export type NpcRole = 'leader' | 'agent' | 'inhabitant'

export interface BuildNpcInput {
  worldId: string
  factionId?: string
  regionId?: string
  poiId?: string
  role?: NpcRole
  /** A concrete objective (the "side-quest hook" surfaced on the NPC page). */
  want?: string
  /** A profession label (e.g. "blacksmith") used in place of the bare role. */
  occupation?: string
  /** Central table registry, so flavor/want pools can be customized. */
  tables?: ResolvedTables
}

// A want (the NPC's quest hook / general drive): a favor to ask or a personal
// pursuit, drawn from the editable NPC tables, falling back to the built-ins.
function pickWant(rng: SeededRandom, tables?: ResolvedTables): string {
  if (tables) {
    const combined = [...tables.texts(NPC_FAVOR_TABLE_ID), ...tables.texts(NPC_PURSUIT_TABLE_ID)]
    if (combined.length > 0) return rng.pick(combined)
  }
  return pickNpcWant(rng)
}

// Races weighted toward human, matching the rest of the app's NPC generation.
const RACE_POOL = ['human', 'human', 'human', 'human', 'elf', 'dwarf', 'halfling', 'half-orc', 'half-elf', 'goblin']
const SD_CLASSES = ['Fighter', 'Priest', 'Thief', 'Wizard']

// Cairn name tables are id'd by race + gender; humans use the generic name +
// surname tables, other races have their own first-name tables (no surname).
function nameTableId(race: string, gender: 'male' | 'female'): string {
  if (race === 'human') return `table-cairn-names-${gender}`
  return `table-cairn-names-${race}-${gender}`
}

// Pure, seeded NPC generator for world generation. Universal fields come from the
// Cairn trait/name tables; the SystemBlock is rolled for the realm's actual
// system via a seeded dice adapter so stats are deterministic and system-correct.
export function buildNpc(
  input: BuildNpcInput,
  systemConfig: SystemConfig,
  rng: SeededRandom,
): NPC {
  const now = Date.now()
  const rollDice = makeSeededDice(rng)

  // --- Identity ---
  const gender: 'male' | 'female' = rng.chance(0.5) ? 'male' : 'female'
  const race = rng.pick(RACE_POOL)
  const firstName = pickCairn(rng, nameTableId(race, gender))
  const surname = race === 'human' ? pickCairn(rng, 'table-cairn-surnames') : ''
  const name = [firstName, surname].filter(Boolean).join(' ') || 'Unnamed'

  // --- Flavor (Cairn character traits) ---
  // Consumed in exact order (physique, skin, hair, face, speech, clothing, virtue, vice)
  // so seeded worldgen output is unchanged.
  const flavor = buildHumanoidFlavor(rng, input.tables)

  // --- SystemBlock (rolled for the realm's actual system) ---
  const block = buildDefaultSystemBlock(systemConfig)
  block.systemId = systemConfig.id
  block.stats = rollStats(systemConfig, rollDice)
  if (systemConfig.hasLevel) block.level = rng.between(1, 4)
  if (systemConfig.hasClass) block.className = rng.pick(SD_CLASSES)
  const conMod = block.stats.find((s) => s.key === 'con')?.modifier
  const level = block.level ?? 1
  block.hp = rollHpForLevel(systemConfig, rollDice, level, conMod)
  block.maxHp = block.hp

  const role: NpcRole = input.role ?? 'inhabitant'
  const roleLabel = input.occupation ?? role
  const article = /^[aeiou]/i.test(race) ? 'An' : 'A'

  // ~1 in 3 NPCs carries an ironic/tragic flaw — a memorable, playable hook.
  const flawPool = input.tables?.texts(NPC_FLAW_TABLE_ID)
  const flaw = rng.chance(0.34)
    ? rng.pick(flawPool && flawPool.length > 0 ? flawPool : NPC_FLAWS)
    : null

  return {
    id: newId(),
    worldId: input.worldId,
    name,
    race,
    factionIds: input.factionId ? [input.factionId] : [],
    regionId: input.regionId ?? null,
    poiId: input.poiId ?? null,
    lifeStatus: 'alive',
    movementStatus: 'present',
    description: `${article} ${race} ${roleLabel} — ${flavor.traits[0].toLowerCase()} but ${flavor.traits[1].toLowerCase()}. ${flavor.personality}.${flaw ? ` ${flaw}.` : ''}`,
    traits: flavor.traits,
    motivation: flavor.motivation,
    appearance: flavor.appearance,
    voice: flavor.voice,
    // Faction NPCs carry their agenda goal; everyone else gets a want from the
    // NPC wants table (a favor to ask the party, or a personal pursuit), so
    // every NPC is a potential quest-giver.
    want: input.want ?? pickWant(rng, input.tables),
    tags: [role],
    imageUrl: null,
    systemBlock: block,
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}
