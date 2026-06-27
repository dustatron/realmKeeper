import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { RuinState } from '@domain/entities/RuinSite'
import { pickCairn } from '@domain/services/worldgen/cairnPick'
import { pickSiteHistory, OCCUPANT_ACTIVITIES } from '~/lib/worldgen/siteHistory'
import { RUIN_CREATURE_POOLS } from './ruinCreaturePools'
import {
  RUIN_PURPOSES,
  RUIN_AREA_NAMES,
  RUIN_AREA_READALOUD,
  RUIN_AREA_DETAILS,
  RUIN_DISCOVERIES,
  RUIN_FAILED_PARTY_DISCOVERY,
  RUIN_HOOKS,
} from '@domain/data/ruin-tables'

export interface OccupantSpec {
  slugs: string[]
  count: number
  activity: string
}

export interface LootSpec {
  magic: boolean
  notable: boolean
}

export interface RuinAreaPlan {
  name: string
  order: number
  isEntry: boolean
  readAloud: string
  detail: string
  discovery: string | null
  occupantSpecs: OccupantSpec[]
  lootSpecs: LootSpec[]
}

export interface RuinSitePlan {
  origin: string
  fall: string
  builderCulture: string
  era: string
  currentState: RuinState
  factionId: string | null
  hook: string
  notablePrizeAreaIndex: number
  areas: RuinAreaPlan[]
}

const STATE_TABLE: Array<{ value: RuinState; weight: number }> = [
  { value: 'empty', weight: 2 },
  { value: 'beast-claimed', weight: 4 },
  { value: 'haunted', weight: 3 },
  { value: 'cult-site', weight: 2 },
  { value: 'faction-held', weight: 3 },
]

function pickState(rng: SeededRandom): RuinState {
  const total = STATE_TABLE.reduce((s, e) => s + e.weight, 0)
  let r = rng.between(1, total)
  for (const e of STATE_TABLE) {
    r -= e.weight
    if (r <= 0) return e.value
  }
  return 'empty'
}

export function generateRuinSite(
  seed: string,
  tier: 'easy' | 'tough' | 'perilous',
  factionIds: string[],
  usedHistory: Set<string>,
  rng: SeededRandom,
): RuinSitePlan {
  // Suppress unused parameter warning — seed is reserved for future child-rng use.
  void seed
  void tier

  const purpose = rng.pick(RUIN_PURPOSES)
  const { builderCulture, era, fate } = pickSiteHistory(rng, usedHistory)
  const origin = `Built by ${builderCulture} ${era} as ${purpose}.`
  const fall = `Then ${fate}.`

  let currentState = pickState(rng)
  let factionId: string | null = null
  if (currentState === 'faction-held') {
    if (factionIds.length > 0) factionId = rng.pick(factionIds)
    else currentState = 'beast-claimed'
  }

  const areaCount = rng.between(2, 4)
  const names = rng.sample(RUIN_AREA_NAMES, areaCount)
  // deepest area holds the prize
  const notablePrizeAreaIndex = areaCount - 1
  const pool = currentState === 'empty' ? [] : RUIN_CREATURE_POOLS[currentState]

  // Guarantee at least one discovery across the ruin.
  const discoveryArea = rng.between(0, areaCount - 1)

  const areas: RuinAreaPlan[] = []
  for (let i = 0; i < areaCount; i++) {
    const isDeepest = i === areaCount - 1
    const isEntry = i === 0

    // Occupants: concentrate in the deepest ("lair") area; some in the middle.
    const occupantSpecs: OccupantSpec[] = []
    if (pool.length > 0 && !isEntry) {
      const count = isDeepest ? rng.between(2, 4) : rng.between(0, 2)
      if (count > 0) {
        occupantSpecs.push({
          slugs: rng.sample(pool, Math.min(2, pool.length)),
          count,
          activity: rng.pick(OCCUPANT_ACTIVITIES),
        })
      }
    }

    // Loot: prize in the deepest area; chance of extra loot elsewhere.
    const lootSpecs: LootSpec[] = []
    if (isDeepest) {
      lootSpecs.push({ magic: rng.chance(0.6), notable: true })
    } else if (rng.chance(0.4)) {
      lootSpecs.push({ magic: rng.chance(0.25), notable: false })
    }

    // Discovery: guaranteed in discoveryArea; the deepest area may carry the
    // "failed party" flavor; otherwise occasional.
    let discovery: string | null = null
    if (i === discoveryArea) {
      discovery = rng.pick(RUIN_DISCOVERIES)
    } else if (currentState === 'empty' && isDeepest && rng.chance(0.3)) {
      discovery = rng.pick(RUIN_FAILED_PARTY_DISCOVERY)
    } else if (rng.chance(0.2)) {
      discovery = rng.pick(RUIN_DISCOVERIES)
    }

    areas.push({
      name: names[i] ?? `Area ${i + 1}`,
      order: i,
      isEntry,
      readAloud: rng.pick(RUIN_AREA_READALOUD),
      detail: rng.pick(RUIN_AREA_DETAILS),
      discovery,
      occupantSpecs,
      lootSpecs,
    })
  }

  const place = areas[notablePrizeAreaIndex].name
  const prize = pickCairn(rng, 'table-cairn-lair') ? 'a lost relic' : 'a hoard'
  const hook = rng.pick(RUIN_HOOKS).replace('{prize}', prize).replace('{place}', place)

  return {
    origin,
    fall,
    builderCulture,
    era,
    currentState,
    factionId,
    hook,
    notablePrizeAreaIndex,
    areas,
  }
}
