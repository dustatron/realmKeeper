/** Pure backfill helper used by the db.version(44) upgrade — POIs gain wealthBand. */
export function withWealthBandDefault<T extends Record<string, unknown>>(poi: T): T {
  if (poi.wealthBand === undefined) return { ...poi, wealthBand: null }
  return poi
}

/** Pure backfill helper used by the db.version(44) upgrade — NPCs gain wealthTier. */
export function withWealthTierDefault<T extends Record<string, unknown>>(npc: T): T {
  if (npc.wealthTier === undefined) return { ...npc, wealthTier: null }
  return npc
}

/** Pure backfill helper used by the db.version(44) upgrade — Regions gain front. */
export function withFrontDefault<T extends Record<string, unknown>>(region: T): T {
  if (region.front === undefined) return { ...region, front: null }
  return region
}
