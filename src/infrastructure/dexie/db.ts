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
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { GameMap } from '@domain/entities/GameMap'
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
  factionPresences: EntityTable<FactionPresence, 'id'>
  poiEvents: EntityTable<POIEvent, 'id'>
  gameMaps: EntityTable<GameMap, 'id'>
}

const storesV5 = {
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

const storesV6 = {
  systemConfigs: 'id',
  realms: 'id, systemId',
  regions: 'id, realmId',
  factions: 'id, realmId, status, isParty',
  npcs: 'id, realmId, factionId, regionId, poiId, *tags',
  factionRelationships: 'id, factionId, targetId, [factionId+targetId]',
  pois: 'id, regionId, parentPoiId, type',
  paths: 'id, fromPoiId, toPoiId, [fromPoiId+toPoiId]',
  realmNotes: 'id, realmId, isMain, sortOrder',
  worldEvents: 'id, realmId, [year+season+day]',
  weatherHistory: 'id, realmId, [year+season+day]',
  tableSets: 'id, source, systemId',
  tableDefs: 'id, setId, *tags, systemId',
  rollHistory: 'id, realmId, tableId, timestamp',
  factionPresences: 'id, factionId, poiId, [factionId+poiId]',
  poiEvents: 'id, poiId, realmId, type, isActive, [realmId+isActive]',
}

const stores = {
  ...storesV6,
  pois: 'id, regionId, parentPoiId, type, mapRef',
  gameMaps: 'id, ownerRealmId, ownerPoiId',
}

db.version(1).stores(storesV5)

db.version(2).stores(storesV5).upgrade((tx) => {
  seedDatabase(tx)
})

// v3: System tables now served from code — clean old seeded data from DB
db.version(3).stores(storesV5).upgrade(async (tx) => {
  const defs = await tx.table('tableDefs').toArray()
  const sysDefIds = defs.filter((d: TableDef) => d.systemId).map((d: TableDef) => d.id)
  if (sysDefIds.length > 0) await tx.table('tableDefs').bulkDelete(sysDefIds)

  const sets = await tx.table('tableSets').toArray()
  const sysSetIds = sets.filter((s: TableSet) => s.systemId).map((s: TableSet) => s.id)
  if (sysSetIds.length > 0) await tx.table('tableSets').bulkDelete(sysSetIds)
})

// v4: Add completedThroughDay to realms
db.version(4).stores(storesV5).upgrade(async (tx) => {
  const realms = await tx.table('realms').toArray()
  for (const realm of realms) {
    if (realm.completedThroughDay === undefined) {
      await tx.table('realms').put({ ...realm, completedThroughDay: -1 })
    }
  }
})

// v5: Add daysPerWeek + watchesPerDay to realms
db.version(5).stores(storesV5).upgrade(async (tx) => {
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

// v6: POI hierarchy overhaul — new fields, watch string→number, new tables
db.version(6).stores(storesV6).upgrade(async (tx) => {
  const watchNameToNumber: Record<string, number> = {
    morning: 1,
    afternoon: 2,
    night: 3,
  }

  // POIs: add new nullable fields
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    await tx.table('pois').put({
      ...poi,
      parentPoiId: poi.parentPoiId ?? null,
      subtypeLabel: poi.subtypeLabel ?? null,
      floor: poi.floor ?? null,
      position: poi.position ?? null,
      mapRef: poi.mapRef ?? null,
    })
  }

  // Paths: baseTravelDays*3 → baseTravelWatches, remove regionId, set type
  const paths = await tx.table('paths').toArray()
  for (const path of paths) {
    const { regionId: _regionId, baseTravelDays, ...rest } = path
    await tx.table('paths').put({
      ...rest,
      baseTravelWatches: (baseTravelDays ?? 1) * 3,
      type: path.type ?? 'road',
    })
  }

  // NPCs: isAlive → lifeStatus, add movementStatus + poiId, remove location + isAlive
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    const { isAlive, location: _location, ...rest } = npc
    await tx.table('npcs').put({
      ...rest,
      lifeStatus: isAlive === false ? 'dead' : 'alive',
      movementStatus: npc.movementStatus ?? 'present',
      poiId: npc.poiId ?? null,
    })
  }

  // Realms: convert currentWatch from string to number
  const realms = await tx.table('realms').toArray()
  for (const realm of realms) {
    if (typeof realm.currentWatch === 'string') {
      await tx.table('realms').put({
        ...realm,
        currentWatch: watchNameToNumber[realm.currentWatch] ?? 1,
      })
    }
  }

  // WorldEvents: convert watch from string to number
  const worldEvents = await tx.table('worldEvents').toArray()
  for (const event of worldEvents) {
    if (typeof event.watch === 'string') {
      await tx.table('worldEvents').put({
        ...event,
        watch: watchNameToNumber[event.watch] ?? 1,
      })
    }
  }

  // WeatherHistory: convert watch from string to number
  const weatherHistory = await tx.table('weatherHistory').toArray()
  for (const weather of weatherHistory) {
    if (typeof weather.watch === 'string') {
      await tx.table('weatherHistory').put({
        ...weather,
        watch: watchNameToNumber[weather.watch] ?? 1,
      })
    }
  }
})

// v7: Add gameMaps table + mapRef index on pois
db.version(7).stores(stores)

// v8: Add markerColor to POIs
db.version(8).stores(stores).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.markerColor === undefined) {
      await tx.table('pois').put({ ...poi, markerColor: null })
    }
  }
})

// v9: Add leaderNpcId to factions
db.version(9).stores(stores).upgrade(async (tx) => {
  const factions = await tx.table('factions').toArray()
  for (const f of factions) {
    if (f.leaderNpcId === undefined) {
      await tx.table('factions').put({ ...f, leaderNpcId: null })
    }
  }
})

// v10: Add features/dangers/settlements/resources to regions
db.version(10).stores(stores).upgrade(async (tx) => {
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.features === undefined) {
      await tx.table('regions').put({
        ...r,
        features: [],
        dangers: [],
        settlements: [],
        resources: [],
      })
    }
  }
})

// v11: Add boundary to regions
db.version(11).stores(stores).upgrade(async (tx) => {
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.boundary === undefined) {
      await tx.table('regions').put({ ...r, boundary: null })
    }
  }
})

// v12: Add color to regions
db.version(12).stores(stores).upgrade(async (tx) => {
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.color === undefined) {
      await tx.table('regions').put({ ...r, color: null })
    }
  }
})

// Seed system configs on first DB creation
db.on('populate', (tx) => {
  seedDatabase(tx)
})

export { db }
