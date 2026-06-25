/** Pure backfill helpers used by the db.version(36) upgrade. */

export function withHookIdDefault<T extends Record<string, unknown>>(row: T): T {
  if (row.hookId === undefined) return { ...row, hookId: null }
  return row
}

export function withGameMapKindDefault<T extends Record<string, unknown>>(map: T): T {
  if (map.kind === undefined) return { ...map, kind: 'image' }
  return map
}
