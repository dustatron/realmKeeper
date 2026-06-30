/** Pure backfill helper used by the db.version(43) upgrade. */
export function withTradeDefault<T extends Record<string, unknown>>(poi: T): T {
  if (poi.trade === undefined) return { ...poi, trade: null }
  return poi
}
