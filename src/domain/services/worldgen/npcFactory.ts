import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { NPC } from '@domain/entities/NPC'
import type { Disposition } from '@shared/constants'
import { newId } from '@shared/ulid'
import { pickCairn } from './cairnPick'
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
  traits: string[]   // [virtue, vice]
  motivation: string // virtue
}

/**
 * Universal humanoid flavor from the Cairn trait tables.
 * IMPORTANT: the rng.pick call ORDER below EXACTLY matches the order in
 * buildNpc.ts (physique, skin, hair, face, speech, clothing, virtue, vice)
 * so existing seeded worldgen output is unchanged.
 */
export function buildHumanoidFlavor(rng: SeededRandom): HumanoidFlavor {
  const physique = pickCairn(rng, 'table-cairn-trait-physique')
  const skin = pickCairn(rng, 'table-cairn-trait-skin')
  const hair = pickCairn(rng, 'table-cairn-trait-hair')
  const face = pickCairn(rng, 'table-cairn-trait-face')
  const speech = pickCairn(rng, 'table-cairn-trait-speech')
  const clothing = pickCairn(rng, 'table-cairn-trait-clothing')
  const virtue = pickCairn(rng, 'table-cairn-trait-virtue')
  const vice = pickCairn(rng, 'table-cairn-trait-vice')

  const hairDesc = hair === 'Bald' ? 'a bald head' : `${hair.toLowerCase()} hair`
  const appearance =
    `${physique}, with ${skin.toLowerCase()} skin, ${hairDesc}, and ${face.toLowerCase()} features. ` +
    `Wears ${clothing.toLowerCase()} clothes.`

  return { appearance, voice: speech, traits: [virtue, vice], motivation: virtue }
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
