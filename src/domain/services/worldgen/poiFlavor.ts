import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { PoiKind } from '@domain/data/worldgen/poiKinds'
import { pickCairn } from './cairnPick'

// Each POI kind maps to a Cairn type + feature table pair. Cairn has no "ruin"
// table, so ruins borrow the Lair tables (crumbling forts, ruined towns, …) and
// landmarks borrow the Curiosity tables.
const KIND_TABLES: Record<PoiKind, { type: string; feature: string }> = {
  settlement: { type: 'table-cairn-settlement', feature: 'table-cairn-settlement-feature' },
  dungeon: { type: 'table-cairn-dungeon', feature: 'table-cairn-dungeon-feature' },
  ruin: { type: 'table-cairn-lair', feature: 'table-cairn-lair-feature' },
  landmark: { type: 'table-cairn-curiosity', feature: 'table-cairn-curiosity-feature' },
}

// A one-sentence description weaving the POI's Cairn type + feature with its
// surrounding biome. Deterministic given the same seed, kind, name, and biome.
export function describePoi(
  kind: PoiKind,
  name: string,
  biome: string,
  rng: SeededRandom,
): string {
  const ids = KIND_TABLES[kind]
  const type = pickCairn(rng, ids.type)
  const feature = pickCairn(rng, ids.feature)
  return `${name} is a ${feature.toLowerCase()} ${type.toLowerCase()} amid the ${biome}.`
}

export interface SettlementFlavor {
  subtypeLabel: string
  tags: string[]
  description: string
  readAloud: string
}

// Settlements get richer structured flavor than a single description so their
// detail page reads like the regions/dungeons do: the Cairn settlement type
// becomes the subtype label, its notable feature becomes a tag, and both feed a
// description plus a short read-aloud. Sourced entirely from the Cairn settlement
// tables; deterministic given the same seed.
const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a')

export function buildSettlementFlavor(
  name: string,
  biome: string,
  rng: SeededRandom,
): SettlementFlavor {
  const type = pickCairn(rng, 'table-cairn-settlement')
  const feature = pickCairn(rng, 'table-cairn-settlement-feature')
  const lowerType = type.toLowerCase()
  return {
    subtypeLabel: type,
    // The notable feature reads as varied phrases (adjectives, "Trading Hub",
    // "Built Atop Ruins"), so surface it as a tag badge rather than forcing it
    // into a sentence.
    tags: [feature],
    description: `${article(lowerType) === 'an' ? 'An' : 'A'} ${lowerType} in the ${biome}.`,
    readAloud: `${name} is ${article(lowerType)} ${lowerType} set in the ${biome}; known for being ${feature.toLowerCase()}.`,
  }
}
