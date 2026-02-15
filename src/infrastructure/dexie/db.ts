import Dexie, { type EntityTable } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
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
import type { Rumor } from '@domain/entities/Rumor'
import type { Notice } from '@domain/entities/Notice'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import { seedDatabase } from './seed'

const cloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL as string | undefined

// dexie-cloud-addon augments the Dexie interface with its own `realms` table
// (for access control), which collides with our app `realms` table.
// Omit cloud's `realms` so our EntityTable<Realm> takes precedence.
type AppDB = Omit<Dexie, 'realms'> & {
  systemConfigs: EntityTable<SystemConfig, 'id'>
  worlds: EntityTable<Realm, 'id'>
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
  rumors: EntityTable<Rumor, 'id'>
  notices: EntityTable<Notice, 'id'>
  encounterTables: EntityTable<EncounterTable, 'id'>
}

const db = new Dexie('RealmKeeperDB', {
  addons: cloudUrl ? [dexieCloud] : [],
}) as unknown as AppDB

const storesV5 = {
  systemConfigs: 'id',
  worlds: 'id, systemId',
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
  worlds: 'id, systemId',
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

const storesV7 = {
  ...storesV6,
  pois: 'id, regionId, parentPoiId, type, mapRef',
  gameMaps: 'id, ownerRealmId, ownerPoiId',
}

const stores = {
  ...storesV7,
  rumors: 'id, poiId, regionId, realmId, isUsed',
  notices: 'id, poiId, regionId, realmId, type, isUsed',
  encounterTables: 'id, ownerPoiId, ownerRegionId, realmId',
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
  const realms = await tx.table('worlds').toArray()
  for (const realm of realms) {
    if (realm.completedThroughDay === undefined) {
      await tx.table('worlds').put({ ...realm, completedThroughDay: -1 })
    }
  }
})

// v5: Add daysPerWeek + watchesPerDay to realms
db.version(5).stores(storesV5).upgrade(async (tx) => {
  const realms = await tx.table('worlds').toArray()
  for (const realm of realms) {
    if (realm.daysPerWeek === undefined || realm.watchesPerDay === undefined) {
      await tx.table('worlds').put({
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
  const realms = await tx.table('worlds').toArray()
  for (const realm of realms) {
    if (typeof realm.currentWatch === 'string') {
      await tx.table('worlds').put({
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
db.version(7).stores(storesV7)

// v8: Add markerColor to POIs
db.version(8).stores(storesV7).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.markerColor === undefined) {
      await tx.table('pois').put({ ...poi, markerColor: null })
    }
  }
})

// v9: Add leaderNpcId to factions
db.version(9).stores(storesV7).upgrade(async (tx) => {
  const factions = await tx.table('factions').toArray()
  for (const f of factions) {
    if (f.leaderNpcId === undefined) {
      await tx.table('factions').put({ ...f, leaderNpcId: null })
    }
  }
})

// v10: Add features/dangers/settlements/resources to regions
db.version(10).stores(storesV7).upgrade(async (tx) => {
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
db.version(11).stores(storesV7).upgrade(async (tx) => {
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.boundary === undefined) {
      await tx.table('regions').put({ ...r, boundary: null })
    }
  }
})

// v12: Add color to regions
db.version(12).stores(storesV7).upgrade(async (tx) => {
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.color === undefined) {
      await tx.table('regions').put({ ...r, color: null })
    }
  }
})

// v13: Add rumors, notices, encounterTables tables + new POI play fields
db.version(13).stores(stores).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.readAloud === undefined) {
      await tx.table('pois').put({
        ...poi,
        readAloud: '',
        gmNotes: '',
        trouble: '',
        mood: '',
        sensory: '',
        services: [],
      })
    }
  }
})

// v14: Add imageUrl to NPCs
db.version(14).stores(stores).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    if (npc.imageUrl === undefined) {
      await tx.table('npcs').put({ ...npc, imageUrl: null })
    }
  }
})

// v15: Add want to NPCs
db.version(15).stores(stores).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    if (npc.want === undefined) {
      await tx.table('npcs').put({ ...npc, want: '' })
    }
  }
})

// v16: Migrate data from old `realms` table → `worlds` (Dexie Cloud reserves `realms`)
db.version(16).stores(stores).upgrade(async (tx) => {
  try {
    const old = await tx.table('realms').toArray()
    if (old.length > 0) await tx.table('worlds').bulkPut(old)
  } catch {
    // No old `realms` table — fresh install or already migrated
  }
})

// Seed system configs on first DB creation
db.on('populate', (tx) => {
  seedDatabase(tx)
})

// Configure Dexie Cloud sync when URL is provided
if (cloudUrl) {
  db.cloud.configure({
    databaseUrl: cloudUrl,
    requireAuth: false, // allow offline-first usage, login is optional
  })
}

export { db }
