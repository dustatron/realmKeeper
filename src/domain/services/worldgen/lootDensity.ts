export type LootDensity = 'off' | 'sparse' | 'moderate' | 'frequent'

export const LOOT_DENSITY: Record<LootDensity, number> = {
  off: 0,
  sparse: 0.5,
  moderate: 1,
  frequent: 2,
}
