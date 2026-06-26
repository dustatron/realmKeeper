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
  trouble: string
  mood: string
  sensory: string
}

const SETTLEMENT_TROUBLES = [
  'A nearby road has become unsafe, and merchants are blaming someone inside the settlement.',
  'Food stores are running short after repeated thefts from granaries and cellars.',
  'The well water tastes wrong, and several residents are hiding how sick they feel.',
  'A local faction is pressuring families for coin, labor, or silence.',
  'A respected resident vanished after asking too many questions.',
  'An old dispute between two households is close to becoming open violence.',
  'Strangers arrived with money to spend and questions nobody wants answered.',
  'Something from the surrounding wilds is testing doors and livestock pens at night.',
  'A coming festival or market day is exposing grudges that were easy to ignore.',
  'A religious or civic leader is losing authority, and rivals are moving quickly.',
  'A recent death has been ruled an accident, but the settlement does not believe it.',
  'Travelers keep bringing the same warning from different roads.',
]

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
    description: `${cap(art)} ${lowerType} in the ${where}.`,
    readAloud: `${name} is ${art} ${lowerType} set in the ${where}.`,
    trouble: isSettlement ? rng.pick(SETTLEMENT_TROUBLES) : '',
    mood: isSettlement ? rng.pick(SETTLEMENT_MOODS) : '',
    sensory: isSettlement ? rng.pick(SETTLEMENT_SENSORY) : '',
  }
}
