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
import { seedDatabase } from './seed'

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

const stores = {
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
}

db.version(1).stores(stores)

db.version(2).stores(stores).upgrade((tx) => {
  seedDatabase(tx)
})

// v3: System tables now served from code — clean old seeded data from DB
db.version(3).stores(stores).upgrade(async (tx) => {
  const defs = await tx.table('tableDefs').toArray()
  const sysDefIds = defs.filter((d: TableDef) => d.systemId).map((d: TableDef) => d.id)
  if (sysDefIds.length > 0) await tx.table('tableDefs').bulkDelete(sysDefIds)

  const sets = await tx.table('tableSets').toArray()
  const sysSetIds = sets.filter((s: TableSet) => s.systemId).map((s: TableSet) => s.id)
  if (sysSetIds.length > 0) await tx.table('tableSets').bulkDelete(sysSetIds)
})

// v4: Add completedThroughDay to realms
db.version(4).stores(stores).upgrade(async (tx) => {
  const realms = await tx.table('realms').toArray()
  for (const realm of realms) {
    if (realm.completedThroughDay === undefined) {
      await tx.table('realms').put({ ...realm, completedThroughDay: -1 })
    }
  }
})

// v5: Add daysPerWeek + watchesPerDay to realms
db.version(5).stores(stores).upgrade(async (tx) => {
  const realms = await tx.table('realms').toArray()
  for (const realm of realms) {
    if (realm.daysPerWeek === undefined || realm.watchesPerDay === undefined) {
      await tx.table('realms').put({
        ...realm,
        daysPerWeek: realm.daysPerWeek ?? 7,
        watchesPerDay: realm.watchesPerDay ?? 3,
        completedThroughDay: realm.completedThroughDay ?? -1,
      })
    }
  }
})

// Seed system configs on first DB creation
db.on('populate', (tx) => {
  seedDatabase(tx)
})

export { db }
