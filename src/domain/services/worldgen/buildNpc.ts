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
import {
  NPC_FAVOR_TABLE_ID, NPC_PURSUIT_TABLE_ID, NPC_FLAW_TABLE_ID, NPC_FLAWS,
  NPC_PROFESSION_TABLE_ID, NPC_ARTISAN_TABLE_ID, PROFESSIONS, ARTISAN_TRADES,
} from '@domain/data/worldgen/npc.tables'
import {
  NPC_APPEARANCE_TABLE_ID, NPC_APPEARANCES,
  NPC_MANNERISM_TABLE_ID, NPC_MANNERISMS,
  NPC_POCKET_ITEM_TABLE_ID, NPC_POCKET_ITEMS,
  NPC_SECRET_TABLE_ID, NPC_SECRETS,
  NPC_VILLAIN_TRAIT_TABLE_ID, NPC_VILLAIN_TRAITS,
} from '@domain/data/worldgen/npc-extra.tables'

function pool(tables: ResolvedTables | undefined, id: string, fallback: readonly string[]): readonly string[] {
  const t = tables?.texts(id)
  return t && t.length > 0 ? t : fallback
}

// A first name / surname from the (editable) Cairn name tables, falling back to
// the static Cairn data.
function liveCairn(rng: SeededRandom, tables: ResolvedTables | undefined, id: string): string {
  const t = tables?.texts(id)
  return t && t.length > 0 ? rng.pick(t) : pickCairn(rng, id)
}

// A general profession for townsfolk who aren't tied to a specific shop. Mirrors
// the source's profession → artisan-specialty cascade.
function pickProfession(rng: SeededRandom, tables: ResolvedTables | undefined): string {
  const prof = rng.pick(pool(tables, NPC_PROFESSION_TABLE_ID, PROFESSIONS))
  if (/artisan/i.test(prof)) return rng.pick(pool(tables, NPC_ARTISAN_TABLE_ID, ARTISAN_TRADES))
  return prof
}

export type NpcRole = 'leader' | 'agent' | 'inhabitant'

export interface BuildNpcInput {
  worldId: string
  factionId?: string
  regionId?: string
  poiId?: string
  role?: NpcRole
  /** A concrete objective (the "side-quest hook" surfaced on the NPC page). */
  want?: string
  /** For faction members: what they're doing for the faction (shown alongside want). */
  factionAction?: string
  /** A profession label (e.g. "blacksmith") used in place of the bare role. */
  occupation?: string
  /** Extra races (from the realm) added to the weighted race pool. */
  customRaces?: string[]
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

// Races that have their own first-name tables. Anything else (human + custom
// realm races) draws from the generic human name + surname tables.
const NAMED_RACES = new Set(['elf', 'dwarf', 'halfling', 'half-orc', 'half-elf', 'goblin'])
function usesHumanNames(race: string): boolean {
  return !NAMED_RACES.has(race)
}

// Cairn name tables are id'd by race + gender; humans (and custom races) use the
// generic name + surname tables, the named races have their own first-name tables.
function nameTableId(race: string, gender: 'male' | 'female'): string {
  if (usesHumanNames(race)) return `table-cairn-names-${gender}`
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
  const racePool = input.customRaces?.length ? [...RACE_POOL, ...input.customRaces] : RACE_POOL
  const race = rng.pick(racePool)
  const firstName = liveCairn(rng, input.tables, nameTableId(race, gender))
  const surname = usesHumanNames(race) ? liveCairn(rng, input.tables, 'table-cairn-surnames') : ''
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
  // Shop proprietors arrive with an occupation; faction leaders/agents keep their
  // role. Other townsfolk draw a general profession so they aren't just "an
  // inhabitant."
  const roleLabel = input.occupation ?? (role === 'inhabitant' ? pickProfession(rng, input.tables).toLowerCase() : role)
  const article = /^[aeiou]/i.test(race) ? 'An' : 'A'

  // ~1 in 3 NPCs carries an ironic/tragic flaw — a memorable, playable hook.
  const flawPool = input.tables?.texts(NPC_FLAW_TABLE_ID)
  const flaw = rng.chance(0.34)
    ? rng.pick(flawPool && flawPool.length > 0 ? flawPool : NPC_FLAWS)
    : null

  // --- Extra flavor ---
  // All drawn via CHILD RNGs so they're deterministic per-NPC but never advance
  // the main seeded stream (keeps name/traits/stats/want/flaw byte-identical).
  const lookHook = rng.child('npc-look').pick(pool(input.tables, NPC_APPEARANCE_TABLE_ID, NPC_APPEARANCES))
  const appearance = `${flavor.appearance} ${lookHook}`

  const mr = rng.child('npc-mannerism')
  const mannerism = mr.chance(0.6) ? mr.pick(pool(input.tables, NPC_MANNERISM_TABLE_ID, NPC_MANNERISMS)) : null
  const pr = rng.child('npc-pocket')
  const pocket = pr.chance(0.5) ? pr.pick(pool(input.tables, NPC_POCKET_ITEM_TABLE_ID, NPC_POCKET_ITEMS)) : null
  const sr = rng.child('npc-secret')
  const secret = sr.chance(0.4) ? sr.pick(pool(input.tables, NPC_SECRET_TABLE_ID, NPC_SECRETS)) : null
  const vr = rng.child('npc-villain')
  const villain = (role === 'leader' || role === 'agent') && vr.chance(0.5)
    ? vr.pick(pool(input.tables, NPC_VILLAIN_TRAIT_TABLE_ID, NPC_VILLAIN_TRAITS))
    : null

  // Quick-read GM details kept OUT of the prose description so cards stay legible.
  const notable = [
    mannerism,
    villain,
    pocket ? `On their person: ${pocket}` : null,
    secret ? `Secret: ${secret}` : null,
  ].filter(Boolean).join(' ')

  const description =
    `${article} ${race} ${roleLabel} — ${flavor.traits[0].toLowerCase()} but ${flavor.traits[1].toLowerCase()}. ` +
    `${flavor.personality}.${flaw ? ` ${flaw}.` : ''}`

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
    description,
    notable: notable || undefined,
    traits: flavor.traits,
    motivation: flavor.motivation,
    appearance,
    voice: flavor.voice,
    // Faction NPCs carry their agenda goal; everyone else gets a want from the
    // NPC wants table (a favor to ask the party, or a personal pursuit), so
    // every NPC is a potential quest-giver.
    want: input.want ?? pickWant(rng, input.tables),
    factionAction: input.factionAction,
    tags: [role],
    imageUrl: null,
    systemBlock: block,
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}
