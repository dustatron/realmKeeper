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
]
const AMBIENT_OMENS: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: ['Birdsong falls suddenly silent', 'A cold breeze, out of season', 'Footprints crossing the path'],
  tough: ['Claw marks gouged shoulder-high', 'A carcass, recently killed', 'Distant drums after dark'],
  perilous: ['The air itself feels watched', 'Old bones half-buried in the trail', 'A scream, then nothing'],
}
const LOSS_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: ['A sudden downpour slows travel', 'The trail forks unmarked', 'A pack strap snaps'],
  tough: ['A bridge is washed out', 'Quicksand swallows a pack', 'A rockslide blocks the way'],
  perilous: ['The ground gives way to a sinkhole', 'A flash flood scatters the party', 'A blizzard closes in'],
}
const TREASURE_BY_TIER: Record<'easy' | 'tough' | 'perilous', string[]> = {
  easy: ['A pouch of coins (2d6 sp)', "A traveler's dropped ring", 'A cache of dried food + 1d6 gp'],
  tough: ['A strongbox (3d6 gp)', 'A gem worth 50 gp', 'A fine weapon, lightly used'],
  perilous: ['A hoard fragment (5d10 gp)', 'A jeweled relic (250 gp)', 'An ornate art object'],
}
const NPC_PROMPTS = ['A wary traveler', 'A wounded scout', 'A wandering merchant', 'A lost pilgrim', 'A hermit who knows the land']

const dedup = (xs: string[]): string[] => [...new Set(xs.filter(Boolean))]

export function buildRegionEncounterContent(input: {
  region: { terrain: string }; pois: POI[]; factions?: Faction[]; systemId: string; rng: SeededRandom
}): RegionEncounterContent {
  const { region, pois, factions, systemId, rng } = input
  const tier = tierForTerrain(region.terrain)

  // creature: region monster names + tier top-up to >= 6
  const monsterNames = dedup(
    pois.flatMap((p) => p.monsterRefs).map((r) => getCompendiumById(r.id)?.name ?? ''),
  )
  const creature = [...monsterNames]
  for (let i = 0; creature.length < 6 && i < 12; i++) {
    const m = pickTierMonster(systemId, tier, rng)
    if (m && !creature.includes(m.name)) creature.push(m.name)
  }
  if (creature.length === 0) creature.push('Wandering beasts')

  // discovery: the region's real notable sites
  const sites = dedup(
    pois
      .filter((p) => ['dungeon', 'ruin', 'landmark'].includes(p.type) || p.treasure.some((t) => t.notable || t.isMagic))
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
