import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { NPC } from '@domain/entities/NPC'
import type { Disposition } from '@shared/constants'
import { newId } from '@shared/ulid'
import { pickCairn } from './cairnPick'
import { resolvePool, type ResolvedTables } from './TableProvider'
import {
  MOTIVATIONS, PERSONALITIES, PHYSICAL_TRAITS,
  NPC_MOTIVATION_TABLE_ID, NPC_PERSONALITY_TABLE_ID, NPC_PHYSICAL_TRAIT_TABLE_ID,
} from '@domain/data/worldgen/npc.tables'
import {
  getMonsterDescription,
  systemBlockFromMonster,
  fallbackSystemBlock,
} from '~/lib/worldgen/compendium-utils'

// Even a lurking monster wants something — gives every creature NPC a goal.
export const CREATURE_WANTS = [
  'guard its lair', 'feed on any intruders', 'protect its hoard',
  'expand its hunting grounds', 'avenge a slain packmate', 'escape this place',
  'serve the dungeon\'s master', 'drag fresh prey back to its den',
] as const

export interface HumanoidFlavor {
  appearance: string
  voice: string
  traits: string[]    // [virtue, vice]
  motivation: string  // a drive from the NPC motivation table
  personality: string // a behavior tell
}

/**
 * Universal humanoid flavor from the Cairn trait tables plus a personality tell,
 * a drive, and a notable physical quirk from the Realm Keeper NPC tables. The
 * Cairn picks come first (unchanged order) so the appearance/voice/traits of a
 * given seed are stable; the three new picks follow.
 */
export function buildHumanoidFlavor(rng: SeededRandom, tables?: ResolvedTables): HumanoidFlavor {
  const physique = pickCairn(rng, 'table-cairn-trait-physique')
  const skin = pickCairn(rng, 'table-cairn-trait-skin')
  const hair = pickCairn(rng, 'table-cairn-trait-hair')
  const face = pickCairn(rng, 'table-cairn-trait-face')
  const speech = pickCairn(rng, 'table-cairn-trait-speech')
  const clothing = pickCairn(rng, 'table-cairn-trait-clothing')
  const virtue = pickCairn(rng, 'table-cairn-trait-virtue')
  const vice = pickCairn(rng, 'table-cairn-trait-vice')

  const personality = rng.pick(resolvePool(tables, NPC_PERSONALITY_TABLE_ID, PERSONALITIES))
  const motivation = rng.pick(resolvePool(tables, NPC_MOTIVATION_TABLE_ID, MOTIVATIONS))
  const quirk = rng.pick(resolvePool(tables, NPC_PHYSICAL_TRAIT_TABLE_ID, PHYSICAL_TRAITS))

  const hairDesc = hair === 'Bald' ? 'a bald head' : `${hair.toLowerCase()} hair`
  const appearance =
    `${physique}, with ${skin.toLowerCase()} skin, ${hairDesc}, and ${face.toLowerCase()} features. ` +
    `Wears ${clothing.toLowerCase()} clothes. Notably ${quirk.toLowerCase()}.`

  return { appearance, voice: speech, traits: [virtue, vice], motivation, personality }
}

export interface BuildCreatureNpcInput {
  worldId: string
  regionId: string | null
  poiId: string | null
  systemId: string
  compendiumId: string | null
  name: string
  activity?: string
  depth?: number
  dangerLevel?: string
  disposition?: Disposition
  want?: string
  tags?: string[]
}

/** Shared monster/creature NPC builder. Appearance comes from the bestiary. */
export function buildCreatureNpc(input: BuildCreatureNpcInput, rng: SeededRandom): NPC {
  const now = Date.now()
  const monsterDesc = input.compendiumId ? getMonsterDescription(input.compendiumId) : ''
  const activity = input.activity ?? 'guarding'
  return {
    id: newId(),
    worldId: input.worldId,
    name: input.name,
    factionIds: [],
    regionId: input.regionId,
    poiId: input.poiId,
    lifeStatus: 'alive',
    movementStatus: 'present',
    // RIGHT SOURCE: bestiary description -> appearance; activity -> description.
    appearance: monsterDesc,
    description: `Activity: ${activity}.`,
    traits: [],
    motivation: '',
    voice: '',
    want: input.want ?? rng.pick(CREATURE_WANTS),
    wealthTier: null,
    tags: input.tags ?? ['creature'],
    imageUrl: null,
    systemBlock: input.compendiumId
      ? systemBlockFromMonster(input.compendiumId)
      : fallbackSystemBlock(input.depth ?? 1, input.dangerLevel ?? 'medium', input.systemId),
    disposition: input.disposition ?? 'hostile',
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}
