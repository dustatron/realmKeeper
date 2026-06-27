export interface EncounterCheckResult {
  roll: number
  chance: number
  triggered: boolean
}

/** Roll 1dN (N = clamped chance) and trigger an encounter on a 1. */
export function evaluateEncounterCheck(
  chance: number | null,
  rollSides: (sides: number) => number,
): EncounterCheckResult {
  const n = Math.max(2, Math.min(20, chance ?? 6))
  const roll = rollSides(n)
  return { roll, chance: n, triggered: roll === 1 }
}
