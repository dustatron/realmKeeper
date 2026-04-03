/**
 * LiveStore's raw SQL queries return:
 * - json() columns as strings (e.g. `"[]"` not `[]`)
 * - boolean() columns as integers (0/1 not false/true)
 *
 * This utility normalizes both when used as the `map` option in queryDb().
 */

// All boolean column names across all tables
const BOOLEAN_FIELDS = new Set([
  'hasHitProtection', 'hasLevel', 'hasClass', 'hasArmor',
  'isParty', 'starred', 'visited', 'hasDoor', 'isLocked',
  'isMain', 'recurring', 'isActive', 'isUsed', 'isQuestHook',
])

export function parseJsonRow<T>(row: unknown): T {
  if (!row || typeof row !== 'object') return row as T
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (BOOLEAN_FIELDS.has(k) && (v === 0 || v === 1)) {
      result[k] = v === 1
    } else if (typeof v === 'string') {
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
