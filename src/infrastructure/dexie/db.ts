import Dexie, { type EntityTable } from 'dexie'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { Realm } from '@domain/entities/Realm'
import type { Region } from '@domain/entities/Region'
import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'
import type { RealmNote } from '@domain/entities/RealmNote'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'
import type { TableSet, TableDef } from '@domain/entities/TableDef'
import type { RollHistory } from '@domain/entities/RollHistory'

const db = new Dexie('RealmKeeperDB') as Dexie & {
  systemConfigs: EntityTable<SystemConfig, 'id'>
  realms: EntityTable<Realm, 'id'>
  regions: EntityTable<Region, 'id'>
  factions: EntityTable<Faction, 'id'>
  npcs: EntityTable<NPC, 'id'>
  factionRelationships: EntityTable<FactionRelationship, 'id'>
  pois: EntityTable<POI, 'id'>
  paths: EntityTable<Path, 'id'>
  realmNotes: EntityTable<RealmNote, 'id'>
  worldEvents: EntityTable<WorldEvent, 'id'>
  weatherHistory: EntityTable<WeatherHistory, 'id'>
  tableSets: EntityTable<TableSet, 'id'>
  tableDefs: EntityTable<TableDef, 'id'>
  rollHistory: EntityTable<RollHistory, 'id'>
}

db.version(1).stores({
  systemConfigs: 'id',
  realms: 'id, systemId',
  regions: 'id, realmId',
  factions: 'id, realmId, status, isParty',
  npcs: 'id, realmId, factionId, regionId, *tags',
  factionRelationships: 'id, factionId, targetId, [factionId+targetId]',
  pois: 'id, regionId, type',
  paths: 'id, regionId, [fromPoiId+toPoiId]',
  realmNotes: 'id, realmId, isMain, sortOrder',
  worldEvents: 'id, realmId, [year+season+day]',
  weatherHistory: 'id, realmId, [year+season+day]',
  tableSets: 'id, source, systemId',
  tableDefs: 'id, setId, *tags, systemId',
  rollHistory: 'id, realmId, tableId, timestamp',
})

export { db }
