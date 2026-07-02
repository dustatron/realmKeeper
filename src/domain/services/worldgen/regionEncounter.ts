import type { POI } from '@domain/entities/POI'
import type { Faction } from '@domain/entities/Faction'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { tierForTerrain } from './regionFlavor'
import { pickTierMonster } from '~/lib/worldgen/compendium-utils'
import { getCompendiumById } from '@domain/data/compendium'

export interface RegionEncounterContent {
  creature: string[]; signOmen: string[]; areaEffect: string[]
  loss: string[]; npc: string[]; treasure: string[]
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
// Environmental events — weather, terrain danger, traps, phenomena. A trailing
// token ({creature} / {npc} / {creature|npc}) auto-chains a follow-up roll.
const AREA_EFFECT_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: [
    'A sudden downpour drops visibility',
    'A fallen tree blocks the trail',
    'Boggy ground swallows every step',
    'Biting insects swarm the party',
    'Fog rolls in and the temperature drops',
    'A startled animal bolts across the path {creature}',
    'A rickety bridge sways underfoot',
    'A patch of trail has washed out',
  ],
  tough: [
    'A bridge is washed out entirely',
    'A rockslide crashes down the slope {creature}',
    'Quicksand yawns across the only path',
    'A river runs high and fast at the ford',
    'A thunderstorm builds; lightning splits a tree',
    'An old snare, sprung — and its setter {creature|npc}',
    'A dead beast, half-eaten and warm {creature}',
    'A cold night with no dry wood to be found',
  ],
  perilous: [
    'The ground gives way to a sinkhole',
    'A flash flood roars down the draw',
    'A blizzard closes in without warning',
    'A ledge crumbles underfoot',
    'A poisonous mist settles in the hollow',
    'An avalanche buries the trail behind {creature}',
    'A pit trap, ancient and deep {creature|npc}',
    'Unnatural silence — every creature has fled {creature}',
  ],
}
// Resource attrition — what the party loses to the journey.
const LOSS_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: [
    'A pack strap snaps; something is dropped',
    'A wrong turn costs half a day',
    'A waterskin springs a leak',
    'The map proves out of date',
    'Boots soaked through at a ford; gain fatigue',
    'A day\'s rations go to mold',
  ],
  tough: [
    'Rations spoil in the damp — lose a day\'s food',
    'A tool or weapon breaks under strain',
    'A river crossing sweeps off supplies',
    'A horse or beast goes lame',
    'The party is lost — burn a watch backtracking',
    'The last of the oil and torches gutter out',
  ],
  perilous: [
    'A whole pack is lost to the current',
    'A vital tool shatters when it\'s needed most',
    'A mount is lost outright',
    'Days of supplies ruined; the party goes hungry',
    'Hopelessly lost — lose a full day',
    'The cold steals fingers and toes; lasting injury',
  ],
}
const TREASURE_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: [
    'A pouch of coins (2d6 sp)',
    'A cache of dried food, three days\' worth',
    'A sturdy backpack, barely used',
    'A well-made tool, lost on the road',
    'A serviceable shortbow and half a quiver',
    'A padded gambeson, only lightly worn',
    'A flask of lamp oil and a tinderbox',
    'A handful of mixed coins (3d6 sp)',
  ],
  tough: [
    'A strongbox (3d6 gp)',
    'A gem worth 50 gp',
    'A fine weapon, lightly used',
    'A shield, dented but sound',
    'A suit of leather armor in good repair',
    'A healing draught and a coil of good rope',
    'A vial of rare ink or reagent',
    'A cut gem and a full set of iron rations',
  ],
  perilous: [
    'A hoard fragment (5d10 gp)',
    'A cache of cut gems (4d6 × 10 gp)',
    'An ornate art object',
    'A masterwork weapon, ancient make',
    'A breastplate, tarnished but whole',
    'A chest, locked, dragged from somewhere',
    'A crown or circlet, tarnished but fine',
    'A quiver of fine arrows and a strong bow',
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

  // the region's real notable sites — still used to point signOmen entries
  const sites = dedup(
    pois
      .filter((p) => ['dungeon', 'ruin', 'landmark'].includes(p.type) || (p.treasure ?? []).some((t) => t.notable || t.isMagic))
      .map((p) => p.name),
  )

  // signOmen: location-pointing (for a few sites) + ambient
  const signOmen: string[] = []
  for (const site of sites.slice(0, 4)) {
    signOmen.push(rng.pick(OMEN_TEMPLATES).replace('{site}', site))
  }
  signOmen.push(...AMBIENT_OMENS[tier])

  // areaEffect / loss / treasure by tier
  const areaEffect = [...AREA_EFFECT_BY_TIER[tier]]
  const loss = [...LOSS_BY_TIER[tier]]
  const treasure = [...TREASURE_BY_TIER[tier]]

  // npc: prompts + faction-flavored when available
  const npc = [...NPC_PROMPTS]
  for (const f of (factions ?? []).slice(0, 2)) npc.push(`An agent of the ${f.name}`)

  return { creature, signOmen, areaEffect, loss, npc, treasure }
}
