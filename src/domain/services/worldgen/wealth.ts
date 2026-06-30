import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

// Wealth model for resource-driven worldgen (Phase 3). Pure and deterministic.
//
// A settlement's wealth is a function of its place in the trade graph: refiners
// (hub towns) out-earn extractors; trade connections, luxury output, water, and
// monopoly all push wealth up. The continuous score buckets into five bands.
// NPC wealth is a *distribution* conditioned on the settlement band (rich towns
// have an underclass; poor towns are uniformly poor). Faction wealth aggregates
// the bands of the settlements a faction controls.

/** Settlement wealth band, snapshotted at generation as a content anchor. */
export type WealthBand = 'destitute' | 'poor' | 'modest' | 'prosperous' | 'rich'

/** Individual NPC wealth tier, sampled from a settlement's band. */
export type NpcWealthTier = 'destitute' | 'poor' | 'middling' | 'wealthy'

/** Minimal projection of a settlement needed to score its wealth. */
export interface WealthNode {
  id: string
  /** What the settlement produces, or null if it produces nothing of note. */
  produces: { weightClass: 'bulk' | 'luxury' } | null
  /** extractor = raw deposit; refiner = finished-good hub (worth more). */
  role: 'extractor' | 'refiner'
  /** Number of trade/road connections in the graph. */
  tradeDegree: number
  /** Sits on water (river/coast) — cheap transport, fishing. */
  hasWater: boolean
  /** Sole producer of its good in the whole world. */
  monopoly: boolean
}

/** Ordered bands, lowest → highest. Index doubles as a numeric rank. */
export const WEALTH_BANDS: readonly WealthBand[] = [
  'destitute',
  'poor',
  'modest',
  'prosperous',
  'rich',
] as const

// --- scoring -------------------------------------------------------------

const BASE_EXTRACTOR = 1
const BASE_REFINER = 4 // a hub town starts well ahead of a raw deposit
const PER_TRADE = 1.5 // each road/trade link compounds wealth
const LUXURY_BONUS = 3 // luxury goods carry far more value than bulk
const BULK_BONUS = 0.5 // bulk produce is worth a little
const WATER_BONUS = 2 // cheap transport + fishing
const MONOPOLY_BONUS = 4 // sole-supplier pricing power

/**
 * Score a settlement's wealth from its trade-graph position. Higher is richer.
 * Monotonic in every input: more trade / luxury / water / monopoly never lowers
 * the score.
 */
export function computeWealthScore(node: WealthNode): number {
  let score = node.role === 'refiner' ? BASE_REFINER : BASE_EXTRACTOR

  score += Math.max(0, node.tradeDegree) * PER_TRADE

  if (node.produces) {
    score += node.produces.weightClass === 'luxury' ? LUXURY_BONUS : BULK_BONUS
  }

  if (node.hasWater) score += WATER_BONUS
  if (node.monopoly) score += MONOPOLY_BONUS

  return score
}

// Score thresholds tuned against the bonuses above so the five bands spread
// across realistic graph positions:
//   - isolated raw extractor (no trade)            ~ 1   → destitute
//   - small extractor with a road or two           ~ 3-5 → poor
//   - well-connected extractor / small refiner     ~ 6-9 → modest
//   - busy refiner with trade + water              ~10-13→ prosperous
//   - monopoly luxury hub                          ~14+  → rich
const BAND_THRESHOLDS: readonly { min: number; band: WealthBand }[] = [
  { min: 14, band: 'rich' },
  { min: 10, band: 'prosperous' },
  { min: 6, band: 'modest' },
  { min: 3, band: 'poor' },
  { min: -Infinity, band: 'destitute' },
] as const

/** Bucket a wealth score into one of the five bands. */
export function wealthBand(score: number): WealthBand {
  for (const { min, band } of BAND_THRESHOLDS) {
    if (score >= min) return band
  }
  return 'destitute'
}

// --- NPC wealth distribution --------------------------------------------

// Per-band weighted distribution over NPC tiers. Richer settlements skew toward
// middling/wealthy but keep a real underclass (some poor, even destitute);
// poorer settlements are narrow and bottom-heavy.
const NPC_TIER_WEIGHTS: Record<WealthBand, Record<NpcWealthTier, number>> = {
  destitute: { destitute: 6, poor: 4, middling: 1, wealthy: 0 },
  poor: { destitute: 4, poor: 5, middling: 2, wealthy: 0 },
  modest: { destitute: 2, poor: 4, middling: 4, wealthy: 1 },
  prosperous: { destitute: 2, poor: 3, middling: 5, wealthy: 3 },
  rich: { destitute: 1, poor: 3, middling: 5, wealthy: 5 },
}

const NPC_TIERS: readonly NpcWealthTier[] = [
  'destitute',
  'poor',
  'middling',
  'wealthy',
] as const

/**
 * Sample an NPC's wealth tier given the band of the settlement they live in.
 *
 * A rich settlement yields a WIDE spread: mostly middling/wealthy, but a real
 * chance of poor or even destitute (the urban underclass). A destitute/poor
 * settlement is narrow and bottom-heavy. Deterministic for a given rng.
 */
export function npcWealthTier(
  settlementBand: WealthBand,
  rng: SeededRandom
): NpcWealthTier {
  const weights = NPC_TIER_WEIGHTS[settlementBand]
  const total = NPC_TIERS.reduce((sum, tier) => sum + weights[tier], 0)
  let roll = rng.next() * total
  for (const tier of NPC_TIERS) {
    roll -= weights[tier]
    if (roll < 0) return tier
  }
  return NPC_TIERS[NPC_TIERS.length - 1]
}

// --- faction wealth ------------------------------------------------------

/** Numeric rank of a band (0 = destitute … 4 = rich). */
function bandIndex(band: WealthBand): number {
  return WEALTH_BANDS.indexOf(band)
}

function bandFromIndex(index: number): WealthBand {
  const clamped = Math.max(0, Math.min(WEALTH_BANDS.length - 1, Math.round(index)))
  return WEALTH_BANDS[clamped]
}

/**
 * Aggregate the wealth of a faction from the bands of the settlements it
 * controls. The faction's band is the average of its territory's bands, bumped
 * one step if it holds a monopoly. A faction with no territory is destitute.
 */
export function factionWealth(
  controlledBands: WealthBand[],
  hasMonopoly: boolean
): WealthBand {
  if (controlledBands.length === 0) return 'destitute'

  const avg =
    controlledBands.reduce((sum, band) => sum + bandIndex(band), 0) /
    controlledBands.length

  return bandFromIndex(avg + (hasMonopoly ? 1 : 0))
}
