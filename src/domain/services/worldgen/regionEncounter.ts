import type { POI } from '@domain/entities/POI'
import type { Faction } from '@domain/entities/Faction'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { tierForTerrain } from './regionFlavor'
import { pickTierMonster } from '~/lib/worldgen/compendium-utils'
import { getCompendiumById } from '@domain/data/compendium'

export interface RegionEncounterContent {
  creature: string[]; signOmen: string[]; loss: string[]
  npc: string[]; discovery: string[]; treasure: string[]
}

const OMEN_TEMPLATES = [
  'Fresh tracks lead toward {site}',
  'Smoke rises from the direction of {site}',
  'A distant sound echoes from {site}',
  'Carrion birds circle over {site}',
  'Travelers hurry away from {site}',
  'A blood trail runs off toward {site}',
  'The locals will not speak of {site}',
  'A signpost, half-rotted, still points to {site}',
  'Strange lights were seen over {site} last night',
  'A dropped pack, its owner fled toward {site}',
  'The wind carries a foul smell from {site}',
  'A dying traveler whispers the name of {site}',
  'Game has gone scarce near {site}',
  'A scrawled warning names {site}',
  'The path is worn smooth by something coming from {site}',
]
const AMBIENT_OMENS: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: [
    'Birdsong falls suddenly silent',
    'A cold breeze, out of season',
    'Footprints crossing the path',
    'A scarecrow where no field stands',
    'Cattle lowing uneasily in the distance',
    'A single bootprint, far too large',
    'Mushrooms growing in a perfect ring',
    'A church bell, faint, with no town near',
  ],
  tough: [
    'Claw marks gouged shoulder-high',
    'A carcass, recently killed',
    'Distant drums after dark',
    'Trees stripped of bark in a wide swath',
    'A cairn of skulls beside the road',
    'Crows that follow and do not scatter',
    'Fresh ash drifting on the wind',
    'A warning daubed in dried blood',
  ],
  perilous: [
    'The air itself feels watched',
    'Old bones half-buried in the trail',
    'A scream, then nothing',
    'The shadows fall the wrong way',
    'Every animal has fled the area',
    'A circle of scorched, salted earth',
    'Frost that spreads as you watch',
    'Whispering with no source, in no language',
  ],
}
const LOSS_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: [
    'A sudden downpour slows travel',
    'The trail forks unmarked',
    'A pack strap snaps',
    'A wrong turn costs half a day',
    'Boots soaked through at a ford',
    'A waterskin springs a leak',
    'Biting insects plague the camp',
    'The map proves out of date',
  ],
  tough: [
    'A bridge is washed out',
    'Quicksand swallows a pack',
    'A rockslide blocks the way',
    'A sprained ankle on loose scree',
    'Rations spoil in the damp',
    'A river crossing sweeps off supplies',
    'A cold night, no dry wood',
    'A horse goes lame',
  ],
  perilous: [
    'The ground gives way to a sinkhole',
    'A flash flood scatters the party',
    'A blizzard closes in',
    'A ledge crumbles underfoot',
    'A poisonous mist settles in the hollow',
    'An avalanche buries the trail behind',
    'The cold steals fingers and toes',
    'A guide vanishes in the night',
  ],
}
const TREASURE_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: [
    'A pouch of coins (2d6 sp)',
    "A traveler's dropped ring",
    'A cache of dried food + 1d6 gp',
    'A bundle of trade goods',
    'A silver locket with a faded portrait',
    'A well-made tool, lost on the road',
    'A flask of decent brandy',
    'A handful of mixed coins (3d6 sp)',
  ],
  tough: [
    'A strongbox (3d6 gp)',
    'A gem worth 50 gp',
    'A fine weapon, lightly used',
    'A merchant\'s lost ledger and purse (2d6 gp)',
    'A roll of fine cloth (40 gp)',
    'A signet ring of some house',
    'A vial of rare ink or reagent',
    'A map fragment + a small gem',
  ],
  perilous: [
    'A hoard fragment (5d10 gp)',
    'A jeweled relic (250 gp)',
    'An ornate art object',
    'A reliquary, sealed and heavy (300 gp)',
    'A cache of cut gems (4d6 × 10 gp)',
    'A masterwork weapon, ancient make',
    'A crown or circlet, tarnished but fine',
    'A chest, locked, dragged from somewhere',
  ],
}
const NPC_PROMPTS = [
  'A wary traveler',
  'A wounded scout',
  'A wandering merchant',
  'A lost pilgrim',
  'A hermit who knows the land',
  'A deserter avoiding the roads',
  'A grieving relative seeking someone',
  'A bounty hunter on a trail',
  'A peddler with dubious wares',
  'A surveyor mapping the wilds',
  'A refugee fleeing trouble',
  'A tax collector with a nervous escort',
  'A relic-seeker far from home',
  'A messenger who has lost their way',
]

const dedup = (xs: string[]): string[] => [...new Set(xs.filter(Boolean))]

export function buildRegionEncounterContent(input: {
  region: { terrain: string }; pois: POI[]; factions?: Faction[]; systemId: string; rng: SeededRandom
}): RegionEncounterContent {
  const { region, pois, factions, systemId, rng } = input
  const tier = tierForTerrain(region.terrain)

  // creature: region monster names + tier top-up to >= 6
  const monsterNames = dedup(
    pois.flatMap((p) => p.monsterRefs ?? []).map((r) => getCompendiumById(r.id)?.name ?? ''),
  )
  const creature = [...monsterNames]
  let attempts = 0
  while (creature.length < 6 && attempts++ < 30) {
    const m = pickTierMonster(systemId, tier, rng)
    if (m && !creature.includes(m.name)) creature.push(m.name)
  }
  // Guarantee >=6 even when the tier band / compendium is tiny:
  while (creature.length < 6) creature.push(`Wandering beast ${creature.length + 1}`)

  // discovery: the region's real notable sites
  const sites = dedup(
    pois
      .filter((p) => ['dungeon', 'ruin', 'landmark'].includes(p.type) || (p.treasure ?? []).some((t) => t.notable || t.isMagic))
      .map((p) => p.name),
  )
  const discovery = sites.length > 0 ? [...sites] : ['An unmarked cave', 'A weathered shrine', 'A buried ruin']

  // signOmen: location-pointing (for a few sites) + ambient
  const signOmen: string[] = []
  for (const site of sites.slice(0, 4)) {
    signOmen.push(rng.pick(OMEN_TEMPLATES).replace('{site}', site))
  }
  signOmen.push(...AMBIENT_OMENS[tier])

  // loss / treasure by tier
  const loss = [...LOSS_BY_TIER[tier]]
  const treasure = [...TREASURE_BY_TIER[tier]]

  // npc: prompts + faction-flavored when available
  const npc = [...NPC_PROMPTS]
  for (const f of (factions ?? []).slice(0, 2)) npc.push(`An agent of the ${f.name}`)

  return { creature, signOmen, loss, npc, discovery, treasure }
}
