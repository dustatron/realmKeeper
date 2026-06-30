/** Pure backfill helper used by the db.version(42) upgrade. */
export function withDefiningResourceDefault<T extends Record<string, unknown>>(region: T): T {
  if (region.definingResource === undefined) return { ...region, definingResource: null }
  return region
}
