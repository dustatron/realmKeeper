import { BIOME_COLORS } from '~/lib/hexmap/hexLayout'

export const REGION_COLORS: Record<string, string> = {
  plains: '#22c55e',
  forest: '#166534',
  hills: '#d97706',
  mountain: '#64748b',
  swamp: '#713f12',
  desert: '#fbbf24',
  coast: '#06b6d4',
  road: '#78716c',
  tundra: '#94a3b8',
  other: '#8b5cf6',
}

/** Resolves terrain-word vocab AND biome-key vocab to a color. */
export function colorForTerrain(terrain: string | null | undefined): string {
  if (!terrain) return REGION_COLORS.other
  return REGION_COLORS[terrain] ?? (BIOME_COLORS as Record<string, string>)[terrain] ?? REGION_COLORS.other
}
