import { pixelToAxial, hexDistance } from './hex'

export const MILES_PER_HEX = 6
export const HOURS_PER_HEX = 4

/** Straight-line hex distance between two pixel-space positions. */
export function hexesBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
  hexSize: number,
): number {
  return hexDistance(pixelToAxial(a, hexSize), pixelToAxial(b, hexSize))
}

/**
 * Format a travel estimate from a hex count.
 *
 * Model:
 *   1 hex = 6 miles = 4 hours
 *   2 hexes = 1 day
 *
 * Examples:
 *   1  → "1 hex · 6 mi · 4h"
 *   2  → "2 hexes · 12 mi · 1 day"
 *   3  → "3 hexes · 18 mi · 1 day 4h"
 *   5  → "5 hexes · 30 mi · 2 days 4h"
 */
export function formatTravel(hexes: number): string {
  const hexLabel = hexes === 1 ? '1 hex' : `${hexes} hexes`
  const miles = hexes * MILES_PER_HEX

  const days = Math.floor(hexes / 2)
  const leftoverHours = (hexes % 2) * HOURS_PER_HEX

  let timeStr: string
  if (days === 0) {
    timeStr = `${hexes * HOURS_PER_HEX}h`
  } else if (leftoverHours === 0) {
    timeStr = days === 1 ? '1 day' : `${days} days`
  } else {
    const dayStr = days === 1 ? '1 day' : `${days} days`
    timeStr = `${dayStr} ${leftoverHours}h`
  }

  return `${hexLabel} · ${miles} mi · ${timeStr}`
}
