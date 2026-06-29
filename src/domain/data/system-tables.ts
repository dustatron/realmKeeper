import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { cairnTableSets, cairnTableDefs } from './cairn-tables'
import { shadowdarkTableSets, shadowdarkTableDefs } from './shadowdark-tables'
import { treasureTableSets, treasureTableDefs } from './treasure-tables'
import { settlementProblemTableSets, settlementProblemTableDefs } from './worldgen/settlementProblems'
import { ruinLandmarkTableSets, ruinLandmarkTableDefs } from './ruin-landmark-tables'
import { nameTableSets, nameTableDefs } from './worldgen/names.tables'
import { worldgenExtraTableSets, worldgenExtraTableDefs } from './worldgen/worldgenExtra.tables'
import { shopTableSets, shopTableDefs } from './worldgen/shops.tables'
import { plotHookTableSets, plotHookTableDefs } from './worldgen/plotHooks'
import { npcTableSets, npcTableDefs } from './worldgen/npc.tables'

// ---------------------------------------------------------------------------
// Aggregate all system tables (add more systems here later)
//
// Realm Keeper built-in (system-agnostic) tables follow a stable id scheme so
// user custom tables can override them and saved rolls stay valid:
//   sets:   tableset-rk-<domain>           (e.g. tableset-rk-names, -shops)
//   tables: table-rk-<domain>-<leaf>       (e.g. table-rk-shops-types)
//   per-key families suffix the slugged key (table-rk-region-feature-forest).
// These are static TS (the v3 Dexie migration purges seeded system tables); the
// Tables UI auto-shows anything registered here via getAllSystemSets().
// ---------------------------------------------------------------------------

const allSystemSets: TableSet[] = [...cairnTableSets, ...shadowdarkTableSets, ...treasureTableSets, ...settlementProblemTableSets, ...ruinLandmarkTableSets, ...nameTableSets, ...worldgenExtraTableSets, ...shopTableSets, ...plotHookTableSets, ...npcTableSets]
const allSystemDefs: TableDef[] = [...cairnTableDefs, ...shadowdarkTableDefs, ...treasureTableDefs, ...settlementProblemTableDefs, ...ruinLandmarkTableDefs, ...nameTableDefs, ...worldgenExtraTableDefs, ...shopTableDefs, ...plotHookTableDefs, ...npcTableDefs]

// Pre-built lookup maps for O(1) access
const defById = new Map<string, TableDef>(allSystemDefs.map((d) => [d.id, d]))
const setById = new Map<string, TableSet>(allSystemSets.map((s) => [s.id, s]))

/** All built-in TableDefs, in registration order. */
export function getAllSystemTables(): TableDef[] {
  return allSystemDefs
}

// ---------------------------------------------------------------------------
// Lookup functions (synchronous — mirrors ITableRepository read methods)
// ---------------------------------------------------------------------------

export function getSystemTableById(id: string): TableDef | undefined {
  return defById.get(id)
}

export function getSystemTablesBySystemId(systemId: string): TableDef[] {
  return allSystemDefs.filter((d) => d.systemId === systemId)
}

export function getSystemTablesByTag(tag: string): TableDef[] {
  return allSystemDefs.filter((d) => d.tags.includes(tag))
}

export function getSystemTablesBySetId(setId: string): TableDef[] {
  return allSystemDefs.filter((d) => d.setId === setId)
}

export function getAllSystemSets(): TableSet[] {
  return allSystemSets
}

export function getSystemSetById(id: string): TableSet | undefined {
  return setById.get(id)
}

/** Check if a given set ID belongs to a system (static) set */
export function isSystemSetId(id: string): boolean {
  return setById.has(id)
}

/** Check if a given table ID belongs to a system (static) table */
export function isSystemTableId(id: string): boolean {
  return defById.has(id)
}
