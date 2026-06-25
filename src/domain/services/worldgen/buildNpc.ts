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
  const physique = pickCairn(rng, 'table-cairn-trait-physique')
  const skin = pickCairn(rng, 'table-cairn-trait-skin')
  const hair = pickCairn(rng, 'table-cairn-trait-hair')
  const face = pickCairn(rng, 'table-cairn-trait-face')
  const speech = pickCairn(rng, 'table-cairn-trait-speech')
  const clothing = pickCairn(rng, 'table-cairn-trait-clothing')
  const virtue = pickCairn(rng, 'table-cairn-trait-virtue')
  const vice = pickCairn(rng, 'table-cairn-trait-vice')

  // The Cairn trait values are bare adjectives, so weave them into prose that
  // reads naturally ("Wears frumpy clothes", not "Wears frumpy").
  const hairDesc = hair === 'Bald' ? 'a bald head' : `${hair.toLowerCase()} hair`
  const appearance =
    `${physique}, with ${skin.toLowerCase()} skin, ${hairDesc}, and ${face.toLowerCase()} features. ` +
    `Wears ${clothing.toLowerCase()} clothes.`

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
    description: `A ${race} ${roleLabel} — ${virtue.toLowerCase()} but ${vice.toLowerCase()}.`,
    traits: [virtue, vice],
    motivation: virtue,
    appearance,
    voice: speech,
    // Faction NPCs carry their agenda goal; everyone else gets a want from the
    // NPC wants table (a favor to ask the party, or a personal pursuit), so
    // every NPC is a potential quest-giver.
    want: input.want ?? pickNpcWant(rng),
    tags: [role],
    imageUrl: null,
    systemBlock: block,
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}
