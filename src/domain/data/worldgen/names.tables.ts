import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'
import {
  NAME_TABLE_IDS,
  SETTLEMENT_PREFIX, SETTLEMENT_SUFFIX,
  DUNGEON_PREFIX, DUNGEON_NOUN,
  RUIN_PREFIX, RUIN_NOUN,
  LANDMARK,
  REGION_ADJ, REGION_NOUN, REGION_ROOT, REGION_ROOT_SUFFIX,
  BIOME_REGION_ADJ, BIOME_REGION_NOUN,
  FACTION_ADJ, FACTION_EMBLEM, FACTION_COLLECTIVE_DEFAULT, FACTION_COLLECTIVE_BY_TYPE,
} from './names'

// Browsable TableDef views over the name component pools in names.ts. The arrays
// stay the single source; these wrap them 1:1 (order preserved) so editing a
// custom table in the Tables UI changes generated names without drift.
const SET_ID = 'tableset-rk-names'
const tag = ['worldgen', 'names']

export const nameTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Names',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [], // filled below
  },
]

export const nameTableDefs: TableDef[] = [
  listTable(NAME_TABLE_IDS.settlementPrefix, SET_ID, 'Settlement Name Prefix', SETTLEMENT_PREFIX, [...tag, 'settlement']),
  listTable(NAME_TABLE_IDS.settlementSuffix, SET_ID, 'Settlement Name Suffix', SETTLEMENT_SUFFIX, [...tag, 'settlement']),
  listTable(NAME_TABLE_IDS.dungeonPrefix, SET_ID, 'Dungeon Name Prefix', DUNGEON_PREFIX, [...tag, 'dungeon']),
  listTable(NAME_TABLE_IDS.dungeonNoun, SET_ID, 'Dungeon Name Noun', DUNGEON_NOUN, [...tag, 'dungeon']),
  listTable(NAME_TABLE_IDS.ruinPrefix, SET_ID, 'Ruin Name Prefix', RUIN_PREFIX, [...tag, 'ruin']),
  listTable(NAME_TABLE_IDS.ruinNoun, SET_ID, 'Ruin Name Noun', RUIN_NOUN, [...tag, 'ruin']),
  listTable(NAME_TABLE_IDS.landmark, SET_ID, 'Landmark Names', LANDMARK, [...tag, 'landmark']),
  listTable(NAME_TABLE_IDS.regionAdj, SET_ID, 'Region Adjective', REGION_ADJ, [...tag, 'region']),
  listTable(NAME_TABLE_IDS.regionNoun, SET_ID, 'Region Noun', REGION_NOUN, [...tag, 'region']),
  listTable(NAME_TABLE_IDS.regionRoot, SET_ID, 'Region Root', REGION_ROOT, [...tag, 'region']),
  listTable(NAME_TABLE_IDS.regionRootSuffix, SET_ID, 'Region Root Suffix', REGION_ROOT_SUFFIX, [...tag, 'region']),
  ...Object.entries(BIOME_REGION_ADJ).map(([biome, list]) =>
    listTable(NAME_TABLE_IDS.regionAdjBiome(biome), SET_ID, `Region Adjective — ${biome}`, list, [...tag, 'region', biome]),
  ),
  ...Object.entries(BIOME_REGION_NOUN).map(([biome, list]) =>
    listTable(NAME_TABLE_IDS.regionNounBiome(biome), SET_ID, `Region Noun — ${biome}`, list, [...tag, 'region', biome]),
  ),
  listTable(NAME_TABLE_IDS.factionAdj, SET_ID, 'Faction Adjective', FACTION_ADJ, [...tag, 'faction']),
  listTable(NAME_TABLE_IDS.factionEmblem, SET_ID, 'Faction Emblem', FACTION_EMBLEM, [...tag, 'faction']),
  listTable(NAME_TABLE_IDS.factionCollectiveDefault, SET_ID, 'Faction Collective', FACTION_COLLECTIVE_DEFAULT, [...tag, 'faction']),
  ...Object.entries(FACTION_COLLECTIVE_BY_TYPE).map(([type, list]) =>
    listTable(NAME_TABLE_IDS.factionCollectiveByType(type), SET_ID, `Faction Collective — ${type}`, list, [...tag, 'faction']),
  ),
]

nameTableSets[0].tableIds = nameTableDefs.map((d) => d.id)
