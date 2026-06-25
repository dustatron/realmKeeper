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
