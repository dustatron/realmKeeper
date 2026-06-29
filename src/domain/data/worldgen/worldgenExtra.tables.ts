import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable, weightedTable } from './tableViewUtils'
import { REGION_PROBLEMS, REGION_PROBLEMS_TABLE_ID } from '@domain/services/worldgen/regionFlavor'
import { BIOME_FEATURE_TABLES } from './biomes'
import { PORTAL_NAMES } from './poiKinds'

// Browsable views over assorted world-gen flavor lists. Region problems are
// live-driven (buildRegionFlavor reads REGION_PROBLEMS_TABLE_ID); biome features
// and portal names are browse-only for now (their generators migrate later).

const REGION_SET_ID = 'tableset-rk-region'
const POI_SET_ID = 'tableset-rk-poi'

const biomeFeatureId = (biome: string): string => `table-rk-region-feature-${biome}`
export const PORTAL_NAMES_TABLE_ID = 'table-rk-poi-portal-names'

const regionDefs: TableDef[] = [
  listTable(REGION_PROBLEMS_TABLE_ID, REGION_SET_ID, 'Region Problem', REGION_PROBLEMS, ['worldgen', 'region', 'problem']),
  ...Object.entries(BIOME_FEATURE_TABLES).map(([biome, table]) =>
    weightedTable(
      biomeFeatureId(biome),
      REGION_SET_ID,
      `Biome Feature — ${biome}`,
      table.entries.map((e) => ({ value: e.value, weight: e.weight })),
      ['worldgen', 'region', 'feature', biome],
    ),
  ),
]

const poiDefs: TableDef[] = [
  listTable(PORTAL_NAMES_TABLE_ID, POI_SET_ID, 'Portal Names', PORTAL_NAMES, ['worldgen', 'poi', 'portal']),
]

export const worldgenExtraTableSets: TableSet[] = [
  { id: REGION_SET_ID, name: 'Region', source: 'Realm Keeper', systemId: null, tableIds: regionDefs.map((d) => d.id) },
  { id: POI_SET_ID, name: 'Points of Interest', source: 'Realm Keeper', systemId: null, tableIds: poiDefs.map((d) => d.id) },
]

export const worldgenExtraTableDefs: TableDef[] = [...regionDefs, ...poiDefs]
