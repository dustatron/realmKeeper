import { DEFAULT_MOON_CYCLE_LENGTH } from '@shared/constants'

/** The 8 canonical lunar phases, in cycle order starting at the new moon. */
export const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
] as const

export type MoonPhaseName = (typeof MOON_PHASE_NAMES)[number]

export interface MoonPhase {
  /** Position through the cycle, 0 (new) → 1 (back to new). 0.5 = full. */
  fraction: number
  /** Nearest canonical phase index, 0–7. */
  index: number
  name: MoonPhaseName
}

/**
 * Moon phase for a given campaign day. Purely deterministic — no rolling or
 * persistence. Campaign day 1 is the new moon; the cycle repeats every
 * `cycleLength` days.
 */
export function moonPhase(campaignDay: number, cycleLength = DEFAULT_MOON_CYCLE_LENGTH): MoonPhase {
  const cycle = cycleLength > 0 ? cycleLength : DEFAULT_MOON_CYCLE_LENGTH
  // campaignDay 1 → position 0 (new moon)
  const pos = (((campaignDay - 1) % cycle) + cycle) % cycle
  const fraction = pos / cycle
  const index = Math.round(fraction * 8) % 8
  return { fraction, index, name: MOON_PHASE_NAMES[index] }
}
