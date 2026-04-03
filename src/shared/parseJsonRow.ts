/**
 * LiveStore's raw SQL queries return json() columns as strings.
 * This utility parses any string value that looks like JSON back to a JS value.
 * Used as the `map` option in queryDb() calls.
 */
export function parseJsonRow<T>(row: unknown): T {
  if (!row || typeof row !== 'object') return row as T
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (typeof v === 'string') {
      const t = v.trim()
      if (t === 'null') {
        result[k] = null
      } else if (t.startsWith('[') || t.startsWith('{')) {
        try { result[k] = JSON.parse(v) } catch { result[k] = v }
      } else {
        result[k] = v
      }
    } else {
      result[k] = v
    }
  }
  return result as T
}

export function parseJsonRows<T>(rows: readonly unknown[]): readonly unknown[] {
  return rows.map(row => parseJsonRow<T>(row))
}
