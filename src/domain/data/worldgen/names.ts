import { SeededRandom } from '~/lib/dungeon/SeededRandom'

export type NameKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark' | 'region'
export const NAME_KINDS: NameKind[] = ['settlement', 'dungeon', 'ruin', 'landmark', 'region']

const SETTLEMENT_PREFIX = ['Ash', 'Black', 'Grey', 'Oak', 'Stone', 'Thorn', 'Wind', 'Salt', 'Fern', 'Crow']
const SETTLEMENT_SUFFIX = ['ford', 'haven', 'bury', 'wick', 'moor', 'hollow', 'gate', 'reach', 'mill', 'fall']

const DUNGEON_PREFIX = ['Tomb of', 'Vault of', 'Pit of', 'Halls of', 'Warren of', 'Crypt of', 'Den of']
const DUNGEON_NOUN = ['the Forgotten', 'the Pale King', 'Vël', 'the Worm', 'Ashes', 'the Drowned', 'the Gaunt']

const RUIN_PREFIX = ['Broken', 'Sunken', 'Shattered', 'Hollow', 'Weeping', 'Fallen']
const RUIN_NOUN = ['Spire', 'Keep', 'Temple', 'Bastion', 'Arch', 'Manse']

const LANDMARK = [
  'the Standing Stones', 'the Hanged Oak', 'Gallows Hill', 'the Weeping Falls',
  'the Bone Bridge', 'the Salt Pillar', 'the Watcher\'s Cairn', 'the Black Tarn',
]

// Region naming draws from several sentence templates over large word pools so
// generated worlds don't read as a wall of "<Adj> <Noun>" repeats. An optional
// biome biases the word choice toward terrain-appropriate flavor.
const REGION_ADJ = [
  'Old', 'Wild', 'Far', 'Grim', 'Lost', 'High', 'Low', 'Broken',
  'Hidden', 'Sunken', 'Forgotten', 'Shrouded', 'Riven', 'Wandering',
  'Endless', 'Silent', 'Weeping', 'Forsaken',
]
const REGION_NOUN = [
  'Marches', 'Reaches', 'Downs', 'Wilds', 'Expanse', 'Hinterlands', 'Verge',
  'Barrens', 'Frontier', 'Vale', 'Weald', 'Fells', 'Heath', 'Moors', 'Holt',
  'Scar', 'Steppe', 'Wastes', 'Borderlands', 'Marshes', 'Spurs', 'Hollow',
]
// Invented proper-name roots, recombined into place names.
const REGION_ROOT = [
  'Vael', 'Cael', 'Dun', 'Mor', 'Thal', 'Bryn', 'Garr', 'Esk', 'Orn', 'Kell',
  'Vane', 'Ardh', 'Surn', 'Brae', 'Hesp', 'Lorn', 'Wend', 'Tarn', 'Quor',
  'Ulth', 'Drane', 'Fenn', 'Maur', 'Sable',
]
const REGION_ROOT_SUFFIX = [
  'moor', 'hollow', 'mark', 'fell', 'reach', 'wold', 'gard', 'mere', 'fen',
  'dale', 'heath', 'wick', 'crest', 'march',
]

// Terrain-flavored nouns/adjectives, merged into the pools when a biome is known.
const BIOME_REGION_NOUN: Record<string, string[]> = {
  forest: ['Weald', 'Holt', 'Thornwood', 'Greenmarch'],
  mountains: ['Crags', 'Peaks', 'Spurs', 'Highfells'],
  grasslands: ['Steppe', 'Plains', 'Meadows', 'Downs'],
  desert: ['Wastes', 'Dunes', 'Sands', 'Drylands'],
  marsh: ['Fens', 'Mire', 'Marshes', 'Sloughs'],
  frozen: ['Frostmarch', 'Rime', 'Tundra', 'Whitewastes'],
  blighted: ['Blight', 'Ashlands', 'Ruin', 'Cinders'],
  hills: ['Hills', 'Knolls', 'Uplands', 'Tors'],
  jungle: ['Tangle', 'Greenmaw', 'Deepwood', 'Riverlands'],
  lake: ['Shallows', 'Meres', 'Watershed', 'Lakelands'],
}
const BIOME_REGION_ADJ: Record<string, string[]> = {
  forest: ['Verdant', 'Tangled', 'Shaded'],
  mountains: ['Craggy', 'Windswept', 'Sheer'],
  grasslands: ['Open', 'Rolling', 'Windblown'],
  desert: ['Scorched', 'Sun-Bleached', 'Parched'],
  marsh: ['Drowned', 'Fetid', 'Sodden'],
  frozen: ['Frozen', 'Frostbound', 'Glacial'],
  blighted: ['Blighted', 'Ashen', 'Cursed'],
  hills: ['Rolling', 'Stony', 'Green'],
  jungle: ['Steaming', 'Overgrown', 'Fevered'],
  lake: ['Misted', 'Reed-Choked', 'Still'],
}

function pickRegionName(rng: SeededRandom, biome?: string): string {
  const adj = biome
    ? [...REGION_ADJ, ...(BIOME_REGION_ADJ[biome] ?? [])]
    : REGION_ADJ
  const noun = biome
    ? [...REGION_NOUN, ...(BIOME_REGION_NOUN[biome] ?? [])]
    : REGION_NOUN

  const template = rng.between(0, 4)
  switch (template) {
    case 0:
      return `The ${rng.pick(adj)} ${rng.pick(noun)}`
    case 1:
      return `${rng.pick(noun)} of ${rng.pick(REGION_ROOT)}`
    case 2:
      return `${rng.pick(REGION_ROOT)}${rng.pick(REGION_ROOT_SUFFIX)}`
    case 3:
      return `The ${rng.pick(REGION_ROOT)} ${rng.pick(noun)}`
    default:
      return `${rng.pick(adj)} ${rng.pick(REGION_ROOT)}`
  }
}

export interface PickNameOptions {
  biome?: string
}

export function pickName(
  kind: NameKind,
  rng: SeededRandom,
  opts: PickNameOptions = {},
): string {
  switch (kind) {
    case 'settlement':
      return `${rng.pick(SETTLEMENT_PREFIX)}${rng.pick(SETTLEMENT_SUFFIX)}`
    case 'dungeon':
      return `${rng.pick(DUNGEON_PREFIX)} ${rng.pick(DUNGEON_NOUN)}`
    case 'ruin':
      return `The ${rng.pick(RUIN_PREFIX)} ${rng.pick(RUIN_NOUN)}`
    case 'landmark':
      return rng.pick(LANDMARK)
    case 'region':
      return pickRegionName(rng, opts.biome)
  }
}
