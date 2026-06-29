import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { ResolvedTables } from '@domain/services/worldgen/TableProvider'

export type NameKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark' | 'region'
export const NAME_KINDS: NameKind[] = ['settlement', 'dungeon', 'ruin', 'landmark', 'region']

// Stable table ids for the name component pools. Defined here (not in the view
// file) so the generator and the view share one source without a circular
// import. Per-key families (biome/faction-type) slug the key.
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const NAME_TABLE_IDS = {
  settlementPrefix: 'table-rk-names-settlement-prefix',
  settlementSuffix: 'table-rk-names-settlement-suffix',
  dungeonPrefix: 'table-rk-names-dungeon-prefix',
  dungeonNoun: 'table-rk-names-dungeon-noun',
  ruinPrefix: 'table-rk-names-ruin-prefix',
  ruinNoun: 'table-rk-names-ruin-noun',
  landmark: 'table-rk-names-landmark',
  regionAdj: 'table-rk-names-region-adj',
  regionNoun: 'table-rk-names-region-noun',
  regionRoot: 'table-rk-names-region-root',
  regionRootSuffix: 'table-rk-names-region-root-suffix',
  regionAdjBiome: (b: string) => `table-rk-names-region-adj-${slug(b)}`,
  regionNounBiome: (b: string) => `table-rk-names-region-noun-${slug(b)}`,
  factionAdj: 'table-rk-names-faction-adj',
  factionEmblem: 'table-rk-names-faction-emblem',
  factionCollectiveDefault: 'table-rk-names-faction-collective',
  factionCollectiveByType: (t: string) => `table-rk-names-faction-collective-${slug(t)}`,
} as const

// Name component pools. Exported so names.tables.ts can expose them as browsable
// TableDefs (single source) and so the generator can fall back to them when a
// table isn't present in the provider.
export const SETTLEMENT_PREFIX = ['Ash', 'Black', 'Grey', 'Oak', 'Stone', 'Thorn', 'Wind', 'Salt', 'Fern', 'Crow']
export const SETTLEMENT_SUFFIX = ['ford', 'haven', 'bury', 'wick', 'moor', 'hollow', 'gate', 'reach', 'mill', 'fall']

export const DUNGEON_PREFIX = ['Tomb of', 'Vault of', 'Pit of', 'Halls of', 'Warren of', 'Crypt of', 'Den of']
export const DUNGEON_NOUN = ['the Forgotten', 'the Pale King', 'Vël', 'the Worm', 'Ashes', 'the Drowned', 'the Gaunt']

export const RUIN_PREFIX = ['Broken', 'Sunken', 'Shattered', 'Hollow', 'Weeping', 'Fallen']
export const RUIN_NOUN = ['Spire', 'Keep', 'Temple', 'Bastion', 'Arch', 'Manse']

export const LANDMARK = [
  'the Standing Stones', 'the Hanged Oak', 'Gallows Hill', 'the Weeping Falls',
  'the Bone Bridge', 'the Salt Pillar', 'the Watcher\'s Cairn', 'the Black Tarn',
]

// Region naming draws from several sentence templates over large word pools so
// generated worlds don't read as a wall of "<Adj> <Noun>" repeats. An optional
// biome biases the word choice toward terrain-appropriate flavor.
export const REGION_ADJ = [
  'Old', 'Wild', 'Far', 'Grim', 'Lost', 'High', 'Low', 'Broken',
  'Hidden', 'Sunken', 'Forgotten', 'Shrouded', 'Riven', 'Wandering',
  'Endless', 'Silent', 'Weeping', 'Forsaken',
]
export const REGION_NOUN = [
  'Marches', 'Reaches', 'Downs', 'Wilds', 'Expanse', 'Hinterlands', 'Verge',
  'Barrens', 'Frontier', 'Vale', 'Weald', 'Fells', 'Heath', 'Moors', 'Holt',
  'Scar', 'Steppe', 'Wastes', 'Borderlands', 'Marshes', 'Spurs', 'Hollow',
]
// Invented proper-name roots, recombined into place names.
export const REGION_ROOT = [
  'Vael', 'Cael', 'Dun', 'Mor', 'Thal', 'Bryn', 'Garr', 'Esk', 'Orn', 'Kell',
  'Vane', 'Ardh', 'Surn', 'Brae', 'Hesp', 'Lorn', 'Wend', 'Tarn', 'Quor',
  'Ulth', 'Drane', 'Fenn', 'Maur', 'Sable',
]
export const REGION_ROOT_SUFFIX = [
  'moor', 'hollow', 'mark', 'fell', 'reach', 'wold', 'gard', 'mere', 'fen',
  'dale', 'heath', 'wick', 'crest', 'march',
]

// Terrain-flavored nouns/adjectives, merged into the pools when a biome is known.
export const BIOME_REGION_NOUN: Record<string, string[]> = {
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
export const BIOME_REGION_ADJ: Record<string, string[]> = {
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

// Resolve a pool from the table provider (live custom tables drive generation),
// falling back to the literal array. Returns a non-empty array so rng.pick never
// throws; identical order to the literal keeps seeded output deterministic.
function pool(tables: ResolvedTables | undefined, id: string, fallback: readonly string[]): readonly string[] {
  if (!tables) return fallback
  const texts = tables.texts(id)
  return texts.length > 0 ? texts : fallback
}

function pickRegionName(rng: SeededRandom, biome?: string, tables?: ResolvedTables): string {
  const baseAdj = pool(tables, NAME_TABLE_IDS.regionAdj, REGION_ADJ)
  const baseNoun = pool(tables, NAME_TABLE_IDS.regionNoun, REGION_NOUN)
  const roots = pool(tables, NAME_TABLE_IDS.regionRoot, REGION_ROOT)
  const rootSuffix = pool(tables, NAME_TABLE_IDS.regionRootSuffix, REGION_ROOT_SUFFIX)
  const adj = biome
    ? [...baseAdj, ...pool(tables, NAME_TABLE_IDS.regionAdjBiome(biome), BIOME_REGION_ADJ[biome] ?? [])]
    : baseAdj
  const noun = biome
    ? [...baseNoun, ...pool(tables, NAME_TABLE_IDS.regionNounBiome(biome), BIOME_REGION_NOUN[biome] ?? [])]
    : baseNoun

  const template = rng.between(0, 4)
  switch (template) {
    case 0:
      return `The ${rng.pick(adj)} ${rng.pick(noun)}`
    case 1:
      return `${rng.pick(noun)} of ${rng.pick(roots)}`
    case 2:
      return `${rng.pick(roots)}${rng.pick(rootSuffix)}`
    case 3:
      return `The ${rng.pick(roots)} ${rng.pick(noun)}`
    default:
      return `${rng.pick(adj)} ${rng.pick(roots)}`
  }
}

// ── Faction naming ──────────────────────────────────────────────────────────
// Factions get an evocative proper name (e.g. "The Crimson Hand", "House Vane"),
// keeping the old "<Trait> <Type>" phrase as a description. Each faction type
// biases toward a fitting collective noun, combined with adjective / emblem /
// proper-root pools (the same REGION_ROOT roots double as surnames) across a few
// templates, with signature patterns for Noble Houses, Tribes, and Nomads.
export const FACTION_ADJ = [
  'Crimson', 'Gilded', 'Iron', 'Ashen', 'Hollow', 'Pale', 'Golden', 'Black',
  'Emerald', 'Thorned', 'Veiled', 'Broken', 'Eternal', 'Grey', 'Silent',
  'Bronze', 'Sable', 'Verdant', 'Scarlet', 'Obsidian',
]
export const FACTION_EMBLEM = [
  'Hand', 'Crow', 'Serpent', 'Coin', 'Key', 'Thorn', 'Lantern', 'Star', 'Veil',
  'Oath', 'Wheel', 'Flame', 'Spire', 'Eye', 'Chain', 'Crown', 'Fang', 'Raven',
  'Ember', 'Sun', 'Moon', 'Tide', 'Gate', 'Antler', 'Talon',
]
export const FACTION_COLLECTIVE_DEFAULT = ['Order', 'Circle', 'League', 'Pact', 'Company', 'Covenant']
export const FACTION_COLLECTIVE_BY_TYPE: Record<string, string[]> = {
  Artisans: ['Guild', 'Workshop', 'Makers', 'Hands'],
  Cabal: ['Cabal', 'Circle', 'Conclave', 'Coven'],
  Commoners: ['Folk', 'Union', 'Commons', 'League'],
  Criminal: ['Syndicate', 'Ring', 'Hand', 'Chain'],
  Cult: ['Cult', 'Faithful', 'Communion', 'Flock'],
  Explorers: ['Company', 'Expedition', 'Society', 'Pathfinders'],
  Farmers: ['Grange', 'Commons', 'Cooperative', 'Folk'],
  Guild: ['Guild', 'League', 'Consortium', 'Company'],
  'Holy Order': ['Order', 'Covenant', 'Templars', 'Faithful'],
  Hunters: ['Lodge', 'Pack', 'Company', 'Stalkers'],
  Mercenary: ['Company', 'Banner', 'Blades', 'Free Company'],
  Merchant: ['Coster', 'Company', 'Consortium', 'Concern', 'Cartel'],
  Military: ['Legion', 'Banner', 'Host', 'Guard'],
  'Noble House': ['House', 'Court', 'Line'],
  Nomads: ['Caravan', 'Host', 'Wanderers', 'Clans'],
  Outlaws: ['Band', 'Gang', 'Brotherhood', 'Crew'],
  Scholars: ['Academy', 'Circle', 'College', 'Society'],
  Sect: ['Sect', 'Communion', 'Order', 'Faithful'],
  Tribe: ['Tribe', 'Clan', 'Kin', 'People'],
  Wizards: ['Circle', 'Conclave', 'Coven', 'Order'],
}

export function pickFactionName(type: string, rng: SeededRandom, tables?: ResolvedTables): string {
  const collectivePool = FACTION_COLLECTIVE_BY_TYPE[type]
    ? pool(tables, NAME_TABLE_IDS.factionCollectiveByType(type), FACTION_COLLECTIVE_BY_TYPE[type])
    : pool(tables, NAME_TABLE_IDS.factionCollectiveDefault, FACTION_COLLECTIVE_DEFAULT)
  const collective = rng.pick(collectivePool)
  const adj = rng.pick(pool(tables, NAME_TABLE_IDS.factionAdj, FACTION_ADJ))
  const emblem = rng.pick(pool(tables, NAME_TABLE_IDS.factionEmblem, FACTION_EMBLEM))
  const root = rng.pick(pool(tables, NAME_TABLE_IDS.regionRoot, REGION_ROOT))

  // Signature patterns for types with a strong naming convention.
  if (type === 'Noble House') {
    return rng.between(0, 1) === 0 ? `House ${root}` : `The ${root} Line`
  }
  if (type === 'Tribe' || type === 'Nomads') {
    switch (rng.between(0, 2)) {
      case 0:
        return `The ${root} ${collective}`
      case 1:
        return `The ${emblem} ${collective}`
      default:
        return `${collective} of ${root}`
    }
  }

  switch (rng.between(0, 4)) {
    case 0:
      return `The ${adj} ${collective}`
    case 1:
      return `${collective} of the ${emblem}`
    case 2:
      return `The ${emblem} ${collective}`
    case 3:
      return `${root}'s ${collective}`
    default:
      return `The ${root} ${collective}`
  }
}

export interface PickNameOptions {
  biome?: string
  tables?: ResolvedTables
}

export function pickName(
  kind: NameKind,
  rng: SeededRandom,
  opts: PickNameOptions = {},
): string {
  const { tables } = opts
  switch (kind) {
    case 'settlement':
      return `${rng.pick(pool(tables, NAME_TABLE_IDS.settlementPrefix, SETTLEMENT_PREFIX))}${rng.pick(pool(tables, NAME_TABLE_IDS.settlementSuffix, SETTLEMENT_SUFFIX))}`
    case 'dungeon':
      return `${rng.pick(pool(tables, NAME_TABLE_IDS.dungeonPrefix, DUNGEON_PREFIX))} ${rng.pick(pool(tables, NAME_TABLE_IDS.dungeonNoun, DUNGEON_NOUN))}`
    case 'ruin':
      return `The ${rng.pick(pool(tables, NAME_TABLE_IDS.ruinPrefix, RUIN_PREFIX))} ${rng.pick(pool(tables, NAME_TABLE_IDS.ruinNoun, RUIN_NOUN))}`
    case 'landmark':
      return rng.pick(pool(tables, NAME_TABLE_IDS.landmark, LANDMARK))
    case 'region':
      return pickRegionName(rng, opts.biome, tables)
  }
}
