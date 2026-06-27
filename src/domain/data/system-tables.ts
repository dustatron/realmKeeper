import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { cairnTableSets, cairnTableDefs } from './cairn-tables'
import { shadowdarkTableSets, shadowdarkTableDefs } from './shadowdark-tables'
import { treasureTableSets, treasureTableDefs } from './treasure-tables'
import { settlementProblemTableSets, settlementProblemTableDefs } from './worldgen/settlementProblems'
import { ruinLandmarkTableSets, ruinLandmarkTableDefs } from './ruin-landmark-tables'

// ---------------------------------------------------------------------------
// Aggregate all system tables (add more systems here later)
// ---------------------------------------------------------------------------

const allSystemSets: TableSet[] = [...cairnTableSets, ...shadowdarkTableSets, ...treasureTableSets, ...settlementProblemTableSets, ...ruinLandmarkTableSets]
const allSystemDefs: TableDef[] = [...cairnTableDefs, ...shadowdarkTableDefs, ...treasureTableDefs, ...settlementProblemTableDefs, ...ruinLandmarkTableDefs]

// Pre-built lookup maps for O(1) access
const defById = new Map<string, TableDef>(allSystemDefs.map((d) => [d.id, d]))
const setById = new Map<string, TableSet>(allSystemSets.map((s) => [s.id, s]))

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
