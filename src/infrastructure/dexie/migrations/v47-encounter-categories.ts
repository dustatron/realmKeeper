import { DEFAULT_ENCOUNTER_ENTRIES } from '@domain/data/default-encounter-tables'

/**
 * Pure backfill for the db.version(47) upgrade — the encounter category redesign.
 *
 * The old `loss` category held environmental *events* (sinkholes, blizzards); those
 * are really area effects, so they move to the new `areaEffect` field and `loss` is
 * reseeded with proper resource-attrition defaults. The dropped `discovery` category
 * is archived into a custom section so no GM edits are lost.
 *
 * Idempotent: a row already carrying `areaEffect` is returned unchanged.
 */
export function migrateEncounterCategories<T extends Record<string, unknown>>(row: T): T {
  if (row.areaEffect !== undefined) return row

  const oldLoss = Array.isArray(row.loss) ? (row.loss as string[]) : []
  const oldDiscovery = Array.isArray(row.discovery) ? (row.discovery as string[]) : []
  const customSections = Array.isArray(row.customSections)
    ? [...(row.customSections as Array<Record<string, unknown>>)]
    : []

  if (oldDiscovery.length > 0) {
    customSections.push({
      id: `discovery-archived-${String(row.id ?? 'x')}`,
      name: 'Discovery (archived)',
      entries: oldDiscovery,
    })
  }

  const next = {
    ...row,
    areaEffect: oldLoss,
    loss: [...DEFAULT_ENCOUNTER_ENTRIES.loss],
    customSections,
  } as Record<string, unknown>
  delete next.discovery

  return next as unknown as T
}
