import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { PoiKind } from '@domain/data/worldgen/poiKinds'
import { biomeLabel } from '@domain/data/worldgen/biomes'
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

const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a')
const cap = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

export interface PoiFlavor {
  subtypeLabel: string
  tags: string[]
  description: string
  readAloud: string
}

// Structured flavor for any generated POI, sourced from the Cairn type + feature
// tables for its kind. The type becomes the subtype label and the feature a tag
// badge — Cairn features mix adjectives ("Warped") and noun phrases ("Religious
// Graffiti"), so jamming one in front of the type reads wrong ("a religious
// graffiti unruly copse"). Keeping the feature as a tag leaves a clean,
// grammatical description and read-aloud. Deterministic given the same inputs.
export function buildPoiFlavor(
  kind: PoiKind,
  name: string,
  biome: string,
  rng: SeededRandom,
): PoiFlavor {
  const ids = KIND_TABLES[kind]
  const type = pickCairn(rng, ids.type)
  const feature = pickCairn(rng, ids.feature)
  const lowerType = type.toLowerCase()
  const art = article(lowerType)
  const where = biomeLabel(biome)
  return {
    subtypeLabel: type,
    tags: [feature],
    description: `${cap(art)} ${lowerType} in the ${where}.`,
    readAloud: `${name} is ${art} ${lowerType} set in the ${where}.`,
  }
}
