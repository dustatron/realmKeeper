import { pixelToAxial, hexDistance } from './hex'

export const MILES_PER_HEX = 6

/** Straight-line hex distance between two pixel-space positions. */
export function hexesBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
  hexSize: number,
): number {
  return hexDistance(pixelToAxial(a, hexSize), pixelToAxial(b, hexSize))
}

/**
 * Format a distance-only label from a hex count.
 *
 * Examples:
 *   1  → "1 hex · 6 mi"
 *   2  → "2 hexes · 12 mi"
 *   5  → "5 hexes · 30 mi"
 */
export function formatDistance(hexes: number): string {
  const hexLabel = hexes === 1 ? '1 hex' : `${hexes} hexes`
  const miles = hexes * MILES_PER_HEX
  return `${hexLabel} · ${miles} mi`
}
