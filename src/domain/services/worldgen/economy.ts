import { resourceByName, type ResourceTier } from '../../data/worldgen/resources.catalog'
import type { SettlementSize } from '../../data/worldgen/settlementSize'

// Economic roles and need-derivation for settlements. Pure and deterministic:
// given what a settlement PRODUCES and its size, derive what it must import.
//
// Two roles:
//   - extractor: produces a RAW resource (mine, farm, forest camp). It feeds
//     itself partly but still needs a staple FOOD and at least one FINISHED good.
//   - refiner:   produces a FINISHED good (a hub town). It needs the raw INPUTS
//     that good is made from.
// Large settlements always also need WATER.

/** The special "good" that large settlements always require. Not in the catalog. */
export const WATER = 'water'

/** Staple food an extractor falls back to needing. */
const STAPLE_FOOD = 'grain'
/** Generic finished good an extractor falls back to needing. */
const STAPLE_FINISHED = 'tools'

export type SettlementRole = 'extractor' | 'refiner'

/** Classify a settlement by the tier of the good it produces. */
export function roleForTier(tier: ResourceTier): SettlementRole {
  return tier === 'finished' ? 'refiner' : 'extractor'
}

/**
 * Classify a settlement by the NAME of the good it produces. Unknown names are
 * treated as raw (extractor) — the safe default for ad-hoc deposits.
 */
export function roleForSettlement(produces: string): SettlementRole {
  const def = resourceByName(produces)
  return def ? roleForTier(def.tier) : 'extractor'
}

/**
 * Derive the goods a settlement needs to import, given what it produces and its
 * size.
 *
 * - extractor (raw): a staple food + a finished good.
 * - refiner (finished): the inputs that good is refined from.
 * - large size: always also needs WATER.
 *
 * The result is de-duplicated and never contains `produces` itself.
 */
export function deriveNeeds(produces: string, size: SettlementSize): string[] {
  const def = resourceByName(produces)
  const role = roleForSettlement(produces)

  const needs: string[] = []

  if (role === 'refiner') {
    // A refiner needs its declared inputs.
    needs.push(...(def?.inputs ?? []))
  } else {
    // An extractor needs to eat and to buy basic finished goods.
    needs.push(STAPLE_FOOD, STAPLE_FINISHED)
  }

  if (size === 'large') needs.push(WATER)

  // De-dupe, preserving first-seen order, and never need what we produce.
  const seen = new Set<string>()
  const result: string[] = []
  for (const need of needs) {
    if (need === produces) continue
    if (seen.has(need)) continue
    seen.add(need)
    result.push(need)
  }
  return result
}
