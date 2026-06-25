import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickBiomeFeature, type Biome } from '@domain/data/worldgen/biomes'
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
type Tier = 'easy' | 'tough' | 'perilous'
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
    `A region of ${biome}, marked by ${landmark.toLowerCase()}. ` +
    `Home to ${people[0].toLowerCase()}, prized for its ${resourcePhrase.toLowerCase()}. ` +
    `Travelers speak of ${dangers[0]}.`

  return { description, features, dangers, resources, people }
}
