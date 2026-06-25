import {
  SeededRandom,
  createWeightedTable,
  type WeightedTable,
} from '~/lib/dungeon/SeededRandom'

export type Biome =
  | 'forest' | 'mountains' | 'grasslands' | 'desert' | 'marsh'
  | 'frozen' | 'blighted' | 'hills' | 'jungle' | 'lake'

export const BIOMES: Biome[] = [
  'forest', 'mountains', 'grasslands', 'desert', 'marsh',
  'frozen', 'blighted', 'hills', 'jungle', 'lake',
]

// Region "feature" flavor per biome. Re-authored content (no third-party text).
// Weights are relative; higher = more common.
export const BIOME_FEATURE_TABLES: Record<Biome, WeightedTable<string>> = {
  forest: createWeightedTable({
    'a moss-choked standing stone': 3,
    'a charcoal-burner\'s abandoned camp': 2,
    'a grove the locals refuse to enter': 1,
  }),
  mountains: createWeightedTable({
    'a collapsed mine adit': 3,
    'a windswept watchtower': 2,
    'an eagle-haunted high pass': 1,
  }),
  grasslands: createWeightedTable({
    'a lone burial mound': 3,
    'a crossroads shrine': 2,
    'a ruined drover\'s inn': 1,
  }),
  desert: createWeightedTable({
    'a half-buried obelisk': 3,
    'a dry oasis with a poisoned well': 2,
    'a caravan picked clean by the sands': 1,
  }),
  marsh: createWeightedTable({
    'a sunken boardwalk': 3,
    'a witch\'s stilted hut': 2,
    'a will-o\'-wisp bog': 1,
  }),
  frozen: createWeightedTable({
    'a glacier-cracked cairn': 3,
    'a frozen-over hot spring': 2,
    'a mammoth carcass on the ice': 1,
  }),
  blighted: createWeightedTable({
    'a field of ash where nothing grows': 3,
    'a circle of blackened standing stones': 2,
    'a corpse-road lined with crows': 1,
  }),
  hills: createWeightedTable({
    'a barrow with a broken seal': 3,
    'a shepherd\'s ring of stones': 2,
    'an old beacon-hill': 1,
  }),
  jungle: createWeightedTable({
    'a vine-swallowed step pyramid': 3,
    'a river idol slick with offerings': 2,
    'a clearing of enormous bones': 1,
  }),
  lake: createWeightedTable({
    'a rotting jetty': 3,
    'an island with a single dark tower': 2,
    'a drowned bell that tolls underwater': 1,
  }),
}

export function pickBiomeFeature(biome: Biome, rng: SeededRandom): string {
  return rng.pickWeighted(BIOME_FEATURE_TABLES[biome])
}
