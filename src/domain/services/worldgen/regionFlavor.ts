import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickBiomeFeature, biomeLabel, type Biome } from '@domain/data/worldgen/biomes'
import { pickCairn, sampleCairn } from './cairnPick'

export const REGION_PROBLEMS = [
  'A blight creeps out of the wilds, fouling wells and crops',
  'Two settlements feud over the only reliable water source',
  'Children have gone missing on the road after dark',
  'A monster has driven hunters from the best game lands',
  'A failing mine or harvest threatens the coming winter',
  'A cult has taken root and recruits the desperate',
  'Bandits have closed the main trade road',
  'A disputed succession splits the local powers',
  'An old pact with something in the dark is coming due',
  'Strange weather is ruining the season and frightening folk',
  'A plague spreads faster than the healers can manage',
  'A relic was stolen and rival parties race to recover it',
  'Refugees arrive faster than the region can feed them',
  'A bridge or pass collapsed, cutting off a community',
  'The dead will not rest in one corner of the region',
  'A tax or tithe has turned the common folk to unrest',
  'A predator beast has learned to hunt people',
  'A border dispute is sliding toward open conflict',
  'A spring or shrine has gone foul and the faithful are afraid',
  'Someone powerful has vanished, and their holdings are up for grabs',
  'A creeping curse marks those who linger too long',
  'Smugglers move something dangerous through the region',
  'A drought (or flood) is reshaping who holds power',
  'An outsider arrived with coin and unsettling questions',
  'Wild magic or a planar leak warps a stretch of land',
  'A long-buried grievance has erupted into vendetta',
  'The local lord demands an impossible levy',
  'A famine-driven raid threatens the harvest stores',
  'A sickness afflicts the livestock the region depends on',
  'A prophecy has the population either fleeing or fortifying',
]

// Structured region flavor, sourced from the Cairn region/setting tables that
// already ship in the codebase. Used for every system (the Cairn tables are the
// only region tables we have); deterministic given the same seed + biome.
export interface RegionFlavor {
  description: string
  features: string[]
  dangers: string[]
  resources: string[]
  people: string[]
  problem: string
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

  const problem = rng.pick(REGION_PROBLEMS)

  const resourcePhrase =
    resources.length === 2
      ? `${resources[0]} and ${resources[1]}`
      : resources[0]
  const description =
    `A region of ${biomeLabel(biome)}, marked by ${landmark.toLowerCase()}. ` +
    `Home to ${people[0].toLowerCase()}, prized for its ${resourcePhrase.toLowerCase()}. ` +
    `Travelers speak of ${dangers[0]}.`

  return { description, features, dangers, resources, people, problem }
}
