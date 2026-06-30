import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickBiomeFeature, biomeLabel, type Biome } from '@domain/data/worldgen/biomes'
import { pickCairn, sampleCairn } from './cairnPick'
import { resolvePool, type ResolvedTables } from './TableProvider'
import {
  DEITY_TABLE_ID, DEITIES,
  CULTURE_QUIRK_TABLE_ID, CULTURE_QUIRKS,
  MAGICAL_LANDSCAPE_TABLE_ID, MAGICAL_LANDSCAPES,
} from '@domain/data/worldgen/world-flavor.tables'
import { DISEASE_TABLE_ID, DISEASES } from '@domain/data/worldgen/conditions.tables'

function lcFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

export const REGION_PROBLEMS_TABLE_ID = 'table-rk-region-problem'
export const REGION_RUMORS_TABLE_ID = 'table-rk-region-rumor'

// Evocative region rumors — idea sparks surfaced on the region page.
export const REGION_RUMORS = [
  'the old road shifts its course by night',
  'a star fell in the far hills, and none who sought it returned',
  'the deep woods are quiet in a way that feels watched',
  'an old king\'s gold lies under the third cairn',
  'the river ran red for a day last spring, and no one knows why',
  'a door stands in a field where no house ever was',
  'shepherds hear bells from a valley with no chapel',
  'the dead are buried face-down here, and no one will say why',
  'a green light walks the marsh on moonless nights',
  'every seventh winter, something comes down from the heights',
  'the standing stones are said to count the living',
  'a hermit up the pass trades secrets for bread',
  'cattle won\'t graze the eastern meadow anymore',
  'a drowned village surfaces when the water runs low',
  'travelers vanish on the bridge, but only going north',
  'the foxes here are too clever by half',
  'an old pact keeps the wolves away — for now',
  'the hills hum before a storm',
  'a faceless rider has been seen at the crossroads',
  'the wells all taste of iron since the comet passed',
]

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

export function buildRegionFlavor(biome: Biome, rng: SeededRandom, tables?: ResolvedTables): RegionFlavor {
  const tier = BIOME_TIER[biome]

  // Features: the biome's own evocative feature plus a Cairn landmark.
  const biomeFeature = pickBiomeFeature(biome, rng, tables)
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

  const problemPool = tables?.texts(REGION_PROBLEMS_TABLE_ID)
  const problem = rng.pick(problemPool && problemPool.length > 0 ? problemPool : REGION_PROBLEMS)

  const resourcePhrase =
    resources.length === 2
      ? `${resources[0]} and ${resources[1]}`
      : resources[0]
  // Rumor: an additive flavor line. Picked from a CHILD rng so it doesn't
  // advance the main stream — keeps downstream seeded output (faction names,
  // etc.) byte-identical whether or not rumors are present.
  const rumorPool = tables?.texts(REGION_RUMORS_TABLE_ID)
  const rumor = rng.child('region-rumor').pick(
    rumorPool && rumorPool.length > 0 ? rumorPool : REGION_RUMORS,
  )

  // Additive worldbuilding flavor (religion, custom, the occasional wonder or
  // sickness). All from CHILD rngs so downstream seeded output stays stable.
  const deity = rng.child('region-deity').pick(resolvePool(tables, DEITY_TABLE_ID, DEITIES))
  const culture = rng.child('region-culture').pick(resolvePool(tables, CULTURE_QUIRK_TABLE_ID, CULTURE_QUIRKS))
  const lr = rng.child('region-landscape')
  const landscape = lr.chance(0.4) ? lr.pick(resolvePool(tables, MAGICAL_LANDSCAPE_TABLE_ID, MAGICAL_LANDSCAPES)) : null
  const dr = rng.child('region-disease')
  const disease = dr.chance(0.2) ? dr.pick(resolvePool(tables, DISEASE_TABLE_ID, DISEASES)) : null

  const description =
    `A region of ${biomeLabel(biome)}, marked by ${landmark.toLowerCase()}. ` +
    `Home to ${people[0].toLowerCase()}, prized for its ${resourcePhrase.toLowerCase()}. ` +
    `Travelers speak of ${dangers[0]}. Folk say ${rumor}. ` +
    `The faithful here honor ${deity} ${culture}` +
    `${landscape ? ` ${landscape}` : ''}` +
    `${disease ? ` A sickness lingers in these parts — ${lcFirst(disease)}` : ''}`

  return { description, features, dangers, resources, people, problem }
}
