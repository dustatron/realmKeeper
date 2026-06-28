import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickBiomeFeature, biomeLabel, type Biome } from '@domain/data/worldgen/biomes'
import { pickCairn, sampleCairn } from './cairnPick'

// Structured region flavor, sourced from the Cairn region/setting tables that
// already ship in the codebase. Used for every system (the Cairn tables are the
// only region tables we have); deterministic given the same seed + biome.
export interface RegionFlavor {
  description: string
  features: string[]
  dangers: string[]
  resources: string[]
  people: string[]
}

// Cairn splits terrain/landmarks into easy/tough/perilous difficulty bands. Map
// each biome to the band that best matches its threat level so landmark flavor
// fits the terrain.
export type Tier = 'easy' | 'tough' | 'perilous'
const BIOME_TIER: Record<Biome, Tier> = {
  grasslands: 'easy',
  hills: 'easy',
  forest: 'tough',
  jungle: 'tough',
  desert: 'tough',
  marsh: 'tough',
  lake: 'tough',
  mountains: 'perilous',
  frozen: 'perilous',
  blighted: 'perilous',
}

export function biomeTier(biome: Biome): Tier {
  return BIOME_TIER[biome]
}

const VALID_BIOMES = new Set<string>(Object.keys(BIOME_TIER))

// The region edit UI uses TERRAIN_TYPES words (plains, mountain, swamp, …) which
// are NOT biome keys, so they must be mapped to a tier explicitly — otherwise a
// manually-edited region falls through to 'easy' regardless of its terrain.
const TERRAIN_TIER: Record<string, Tier> = {
  plains: 'easy',
  fields: 'easy',
  grassland: 'easy',
  road: 'easy',
  other: 'easy',
  coast: 'tough',
  swamp: 'tough',
  wetlands: 'tough',
  highlands: 'tough',
  mountain: 'perilous',
  tundra: 'perilous',
}

export function tierForTerrain(terrain: string): Tier {
  if (VALID_BIOMES.has(terrain)) return BIOME_TIER[terrain as Biome]
  return TERRAIN_TIER[terrain.toLowerCase()] ?? 'easy'
}

// Cairn has no generic "region danger" table; derive danger from a Lair (its
// type + feature) and, when the region's people are themselves a threat, from
// them too.
const THREATENING_PEOPLE = new Set([
  'Exiled criminals',
  'Organized bandits',
  'Roaming cultists',
  'Warring clans',
  'Restless soldiers',
])

export function buildRegionFlavor(biome: Biome, rng: SeededRandom): RegionFlavor {
  const tier = BIOME_TIER[biome]

  // Features: the biome's own evocative feature plus a Cairn landmark.
  const biomeFeature = pickBiomeFeature(biome, rng)
  const landmark = pickCairn(rng, `table-cairn-landmark-${tier}`)
  const features = [biomeFeature, landmark]

  // People: exactly one group.
  const people = [pickCairn(rng, 'table-cairn-region-people')]

  // Resources: one or two, no duplicates.
  const resources = sampleCairn(rng, 'table-cairn-region-resources', rng.between(1, 2))

  // Dangers: a lair-based threat, plus the people when they are themselves
  // dangerous.
  const lair = pickCairn(rng, 'table-cairn-lair')
  const lairFeature = pickCairn(rng, 'table-cairn-lair-feature')
  const dangers = [`${lairFeature} ${lair}`.toLowerCase()]
  if (THREATENING_PEOPLE.has(people[0])) dangers.push(people[0].toLowerCase())

  const resourcePhrase =
    resources.length === 2
      ? `${resources[0]} and ${resources[1]}`
      : resources[0]
  const description =
    `A region of ${biomeLabel(biome)}, marked by ${landmark.toLowerCase()}. ` +
    `Home to ${people[0].toLowerCase()}, prized for its ${resourcePhrase.toLowerCase()}. ` +
    `Travelers speak of ${dangers[0]}.`

  return { description, features, dangers, resources, people }
}
