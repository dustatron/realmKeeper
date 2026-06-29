import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { PoiKind } from '@domain/data/worldgen/poiKinds'
import { biomeLabel } from '@domain/data/worldgen/biomes'
import { pickSettlementProblem } from '@domain/data/worldgen/settlementProblems'
import { pickCairn } from './cairnPick'
import type { ResolvedTables } from './TableProvider'
import {
  DUNGEON_GRAFFITI_TABLE_ID, DUNGEON_GRAFFITI,
  STATUE_TABLE_ID, STATUES,
  EPITAPH_TABLE_ID, EPITAPHS,
} from '@domain/data/worldgen/dressing-extra.tables'
import {
  MAGICAL_FOUNTAIN_TABLE_ID, MAGICAL_FOUNTAINS,
  DEITY_TABLE_ID, DEITIES,
} from '@domain/data/worldgen/world-flavor.tables'

function poolOf(tables: ResolvedTables | undefined, id: string, fallback: readonly string[]): readonly string[] {
  const texts = tables?.texts(id)
  return texts && texts.length > 0 ? texts : fallback
}

// A kind-appropriate dressing detail (graffiti, statue, epitaph, fountain, or a
// patron deity). Drawn from a CHILD rng so it never advances the main seeded
// stream — the type/feature/trouble/mood picks stay byte-identical.
function poiDressing(kind: PoiKind, rng: SeededRandom, tables?: ResolvedTables): string {
  const dr = rng.child('poi-dressing')
  const pick = (id: string, fb: readonly string[]) => dr.pick(poolOf(tables, id, fb))
  switch (kind) {
    case 'dungeon':
      return ` ${pick(DUNGEON_GRAFFITI_TABLE_ID, DUNGEON_GRAFFITI)} ${pick(STATUE_TABLE_ID, STATUES)}`
    case 'ruin':
      return ` A worn inscription reads: ${pick(EPITAPH_TABLE_ID, EPITAPHS)} ${pick(STATUE_TABLE_ID, STATUES)}`
    case 'landmark':
      return ` ${pick(STATUE_TABLE_ID, STATUES)}${dr.chance(0.5) ? ` ${pick(MAGICAL_FOUNTAIN_TABLE_ID, MAGICAL_FOUNTAINS)}` : ''}`
    case 'settlement':
      return ` The townsfolk honor ${pick(DEITY_TABLE_ID, DEITIES)}`
    default:
      return ''
  }
}

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
  trouble: string
  mood: string
  sensory: string
}

const SETTLEMENT_MOODS = [
  'watchful',
  'strained',
  'busy but nervous',
  'resentful',
  'cautiously welcoming',
  'exhausted',
  'argumentative',
  'superstitious',
]

const SETTLEMENT_SENSORY = [
  'Smoke hangs low over crowded roofs while voices drop whenever strangers pass.',
  'Mud, livestock, and hearth smoke mix with the sharp sound of hurried work.',
  'Doors close a little too quickly, and every public argument draws a silent crowd.',
  'The main road is busy, but conversations stop near shuttered windows.',
  'Market smells linger over swept thresholds, fresh repairs, and nervous glances.',
  'Rain barrels, boot prints, and whispered names mark the busiest corners.',
]

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
  tables?: ResolvedTables,
): PoiFlavor {
  const ids = KIND_TABLES[kind]
  const type = pickCairn(rng, ids.type)
  const feature = pickCairn(rng, ids.feature)
  const lowerType = type.toLowerCase()
  const art = article(lowerType)
  const where = biomeLabel(biome)
  const isSettlement = kind === 'settlement'
  return {
    subtypeLabel: type,
    tags: [feature],
    description: `${cap(art)} ${lowerType} in the ${where}.${poiDressing(kind, rng, tables)}`,
    readAloud: `${name} is ${art} ${lowerType} set in the ${where}.`,
    trouble: isSettlement ? pickSettlementProblem(rng, null, tables) : '',
    mood: isSettlement ? rng.pick(SETTLEMENT_MOODS) : '',
    sensory: isSettlement ? rng.pick(SETTLEMENT_SENSORY) : '',
  }
}
