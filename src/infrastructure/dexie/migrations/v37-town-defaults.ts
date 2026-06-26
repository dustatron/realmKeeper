/** Pure backfill helper used by the db.version(37) upgrade. */
export function withTownDefaults<T extends Record<string, unknown>>(map: T): T {
  return {
    ...map,
    townData: map.townData ?? null,
    townPreset: map.townPreset ?? null,
    townSeed: map.townSeed ?? null,
    townWalled: map.townWalled ?? null,
  }
}
