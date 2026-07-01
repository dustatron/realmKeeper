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
import type { EntityNote } from '@domain/entities/EntityNote'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'
import type { Doom } from '@domain/entities/Doom'
import { withHookIdDefault, withGameMapKindDefault } from './migrations/v36-defaults'
import { withTownDefaults } from './migrations/v37-town-defaults'
import { withDefiningResourceDefault } from './migrations/v42-resource-defaults'
import { withTradeDefault } from './migrations/v43-trade-defaults'
import { withWealthBandDefault, withWealthTierDefault, withFrontDefault } from './migrations/v44-wealth-defaults'
import { withSettlementFlavorBackfill } from './migrations/v45-settlement-flavor'
import { seedDatabase } from './seed'
import { newId } from '@shared/ulid'

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
  entityNotes: EntityTable<EntityNote, 'id'>
  customCompendiumEntries: EntityTable<CustomCompendiumEntry, 'id'>
  connections: EntityTable<Connection, 'id'>
  hooks: EntityTable<Hook, 'id'>
  dooms: EntityTable<Doom, 'id'>
}

const db = new Dexie('RealmKeeperDB', {
  addons: cloudUrl ? [dexieCloud] : [],
}) as unknown as AppDB

// Old store definitions use `realmId` — these must match the schema at that version
// for Dexie's upgrade chain to work correctly.
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

const storesV16 = {
  ...storesV7,
  rumors: 'id, poiId, regionId, realmId, isUsed',
  notices: 'id, poiId, regionId, realmId, type, isUsed',
  encounterTables: 'id, ownerPoiId, ownerRegionId, realmId',
}

// v17+: realmId → worldId to avoid collision with Dexie Cloud's reserved `realmId`
const stores = {
  systemConfigs: 'id',
  worlds: 'id, systemId',
  regions: 'id, worldId',
  factions: 'id, worldId, status, isParty',
  npcs: 'id, worldId, factionId, regionId, poiId, *tags',
  factionRelationships: 'id, factionId, targetId, [factionId+targetId]',
  pois: 'id, regionId, parentPoiId, type, mapRef',
  paths: 'id, fromPoiId, toPoiId, [fromPoiId+toPoiId]',
  realmNotes: 'id, worldId, isMain, sortOrder',
  worldEvents: 'id, worldId, [year+season+day]',
  weatherHistory: 'id, worldId, [year+season+day]',
  tableSets: 'id, source, systemId',
  tableDefs: 'id, setId, *tags, systemId',
  rollHistory: 'id, worldId, tableId, timestamp',
  factionPresences: 'id, factionId, poiId, [factionId+poiId]',
  poiEvents: 'id, poiId, worldId, type, isActive, [worldId+isActive]',
  gameMaps: 'id, ownerRealmId, ownerPoiId',
  rumors: 'id, poiId, regionId, worldId, isUsed',
  notices: 'id, poiId, regionId, worldId, type, isUsed',
  encounterTables: 'id, ownerPoiId, ownerRegionId, worldId',
}

const storesV18 = {
  ...stores,
  entityNotes: 'id, ownerType, ownerId, worldId, [ownerType+ownerId]',
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
db.version(13).stores(storesV16).upgrade(async (tx) => {
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
db.version(14).stores(storesV16).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    if (npc.imageUrl === undefined) {
      await tx.table('npcs').put({ ...npc, imageUrl: null })
    }
  }
})

// v15: Add want to NPCs
db.version(15).stores(storesV16).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    if (npc.want === undefined) {
      await tx.table('npcs').put({ ...npc, want: '' })
    }
  }
})

// v16: Migrate data from old `realms` table → `worlds` (Dexie Cloud reserves `realms`)
db.version(16).stores(storesV16).upgrade(async (tx) => {
  try {
    const old = await tx.table('realms').toArray()
    if (old.length > 0) await tx.table('worlds').bulkPut(old)
  } catch {
    // No old `realms` table — fresh install or already migrated
  }
})

// v17: Rename realmId → worldId on all records (Dexie Cloud reserves `realmId`)
db.version(17).stores(stores).upgrade(async (tx) => {
  const tablesToMigrate = [
    'regions', 'factions', 'npcs', 'realmNotes',
    'worldEvents', 'weatherHistory', 'rollHistory',
    'poiEvents', 'rumors', 'notices', 'encounterTables',
  ]
  for (const tableName of tablesToMigrate) {
    const rows = await tx.table(tableName).toArray()
    for (const row of rows) {
      if ('realmId' in row && !('worldId' in row)) {
        const { realmId, ...rest } = row
        await tx.table(tableName).put({ ...rest, worldId: realmId })
      }
    }
  }
})

// v18: Add entityNotes table
db.version(18).stores(storesV18)

// v19: Add imageUrl to POIs and Regions
db.version(19).stores(storesV18).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.imageUrl === undefined) {
      await tx.table('pois').put({ ...poi, imageUrl: null })
    }
  }
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.imageUrl === undefined) {
      await tx.table('regions').put({ ...r, imageUrl: null })
    }
  }
})

// v20: Add compendium refs to POIs
db.version(20).stores(storesV18).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.monsterRefs === undefined) {
      await tx.table('pois').put({
        ...poi,
        monsterRefs: [],
        magicItemRefs: [],
        spellRefs: [],
      })
    }
  }
})

// v21: Convert GameMap imageBlob (Blob) → imageUrl (string) for Dexie Cloud sync
db.version(21).stores(storesV18).upgrade(async (tx) => {
  const maps = await tx.table('gameMaps').toArray()
  for (const m of maps) {
    if (m.imageBlob && !m.imageUrl) {
      const blob = m.imageBlob as Blob
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const { imageBlob: _, ...rest } = m
      await tx.table('gameMaps').put({ ...rest, imageUrl: dataUrl })
    }
  }
})

// v22: Convert NPC factionId → factionIds (multi-faction support)
const storesV22 = {
  ...storesV18,
  npcs: 'id, worldId, *factionIds, regionId, poiId, *tags',
}

db.version(22).stores(storesV22).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    const factionIds = npc.factionId ? [npc.factionId] : []
    const { factionId: _, ...rest } = npc
    await tx.table('npcs').put({ ...rest, factionIds })
  }
})

// v23: Add locationSeed to POIs
db.version(23).stores(storesV22).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.locationSeed === undefined) {
      await tx.table('pois').put({ ...poi, locationSeed: null })
    }
  }
})

const storesV25 = {
  ...storesV22,
  customCompendiumEntries: 'id, worldId, kind, name',
}

// v24: Add customSections + disabledCategories to encounter tables
db.version(24).stores(storesV22).upgrade(async (tx) => {
  const tables = await tx.table('encounterTables').toArray()
  for (const t of tables) {
    if (t.customSections === undefined) {
      await tx.table('encounterTables').put({ ...t, customSections: [], disabledCategories: [] })
    }
  }
})

// v25: Add customCompendiumEntries table
db.version(25).stores(storesV25)

const storesV26 = {
  ...storesV25,
  pois: 'id, regionId, parentPoiId, type, mapRef, starred',
}

// v26: Add starred field to POIs
db.version(26).stores(storesV26).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.starred === undefined) {
      await tx.table('pois').put({ ...poi, starred: false })
    }
  }
})

// v27: Add direction/door fields to Paths, traps + room dimensions to POIs
db.version(27).stores(storesV26).upgrade(async (tx) => {
  const paths = await tx.table('paths').toArray()
  for (const p of paths) {
    if (p.direction === undefined) {
      await tx.table('paths').put({
        ...p,
        direction: null,
        hasDoor: false,
        isLocked: false,
        doorDescription: '',
      })
    }
  }
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.traps === undefined) {
      await tx.table('pois').put({
        ...poi,
        traps: [],
        roomWidth: null,
        roomLength: null,
      })
    }
  }
})

// v28: Add equipmentRefs to POIs
db.version(28).stores(storesV26).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.equipmentRefs === undefined) {
      await tx.table('pois').put({ ...poi, equipmentRefs: [] })
    }
  }
})

// v29: Add treasure to POIs
db.version(29).stores(storesV26).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.treasure === undefined) {
      await tx.table('pois').put({ ...poi, treasure: [] })
    }
  }
})

// v30: Add visited, lightLevel, sessionLog to POIs
db.version(30).stores(storesV26).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.visited === undefined) {
      await tx.table('pois').put({
        ...poi,
        visited: false,
        lightLevel: null,
        sessionLog: [],
      })
    }
  }
})

// v31: Add customRaces + raceColors to Realms
db.version(31).stores(storesV26).upgrade(async (tx) => {
  const realms = await tx.table('worlds').toArray()
  for (const realm of realms) {
    if (realm.customRaces === undefined || realm.raceColors === undefined) {
      await tx.table('worlds').put({
        ...realm,
        customRaces: realm.customRaces ?? [],
        raceColors: realm.raceColors ?? {},
      })
    }
  }
})

// v32: Add starred to NPCs + starred compendium IDs to Realms
db.version(32).stores(storesV26).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    if (npc.starred === undefined) {
      await tx.table('npcs').put({ ...npc, starred: false })
    }
  }
  const realms = await tx.table('worlds').toArray()
  for (const realm of realms) {
    if (realm.starredMonsterIds === undefined || realm.starredSpellIds === undefined || realm.starredMagicItemIds === undefined) {
      await tx.table('worlds').put({
        ...realm,
        starredMonsterIds: realm.starredMonsterIds ?? [],
        starredSpellIds: realm.starredSpellIds ?? [],
        starredMagicItemIds: realm.starredMagicItemIds ?? [],
      })
    }
  }
})

// v33: Add disposition to NPCs (no index change needed)
db.version(33).stores(storesV26)

// v34: Add watabou map fields to POIs (no index change needed)
db.version(34).stores(storesV26)

// v35: Add spatialDungeon + dungeonGenOptions to POIs
db.version(35).stores(storesV26).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.spatialDungeon === undefined) {
      await tx.table('pois').put({ ...poi, spatialDungeon: null, dungeonGenOptions: null })
    }
  }
})

const storesV36 = {
  ...storesV26,
  connections: 'id, worldId, fromId, toId, hookId, [worldId+fromId], [worldId+toId]',
  hooks: 'id, worldId, status, contactNpcId',
  notices: 'id, poiId, regionId, worldId, type, isUsed, hookId',
  rumors: 'id, poiId, regionId, worldId, isUsed, hookId',
  gameMaps: 'id, ownerRealmId, ownerPoiId, kind',
}

// v36: narrative graph (connections) + quest aggregate (hooks);
// backfill hookId on notices/rumors and kind on gameMaps.
db.version(36).stores(storesV36).upgrade(async (tx) => {
  for (const table of ['notices', 'rumors']) {
    const rows = await tx.table(table).toArray()
    for (const row of rows) {
      await tx.table(table).put(withHookIdDefault(row))
    }
  }
  const maps = await tx.table('gameMaps').toArray()
  for (const map of maps) {
    await tx.table('gameMaps').put(withGameMapKindDefault(map))
  }
})

// v37: Add town map fields to gameMaps (kind:'town' generated settlement maps)
db.version(37).stores(storesV36).upgrade(async (tx) => {
  const maps = await tx.table('gameMaps').toArray()
  for (const map of maps) {
    await tx.table('gameMaps').put(withTownDefaults(map))
  }
})

// v38: Add ruinSite/landmarkLore/poiGenOptions to POIs (no index change needed)
db.version(38).stores(storesV36).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.ruinSite === undefined) {
      await tx.table('pois').put({ ...poi, ruinSite: null, landmarkLore: null, poiGenOptions: null })
    }
  }
})

const storesV39 = { ...storesV36, rumors: 'id, poiId, regionId, worldId, isUsed, hookId, sourceNpcId' }

// v39: Rumor.sourceNpcId (indexed) + backfill null on existing rumors
db.version(39).stores(storesV39).upgrade(async (tx) => {
  const rumors = await tx.table('rumors').toArray()
  for (const r of rumors) {
    if (r.sourceNpcId === undefined) await tx.table('rumors').put({ ...r, sourceNpcId: null })
  }
})

// v40: Persist InventoryItem.id for legacy NPCs (backfill non-persistently by read-hook; now writing back)
db.version(40).stores(storesV39).upgrade(async (tx) => {
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    const sb = npc.systemBlock as Record<string, unknown> | undefined
    if (!sb) continue
    const inv = (sb.inventory as Array<Record<string, unknown>> | undefined) ?? []
    if (inv.some((it) => it.id === undefined)) {
      await tx.table('npcs').put({
        ...npc,
        systemBlock: {
          ...sb,
          inventory: inv.map((it) => (it.id === undefined ? { ...it, id: newId() } : it)),
        },
      })
    }
  }
})

// v41: POI exploration lifecycle + living-world fields.
// Backfill status (from visited), lastVisitedDate, dangerLevel, currentOccupant.
db.version(41).stores(storesV39).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.status === undefined) {
      await tx.table('pois').put({
        ...poi,
        status: poi.visited ? 'explored' : 'unexplored',
        lastVisitedDate: null,
        dangerLevel: null,
        currentOccupant: null,
      })
    }
  }
})

// v42: Add Region.definingResource (worldgen). No index change needed — backfill null.
// GameMap cell fields (elevation/river/chokepoint) are optional and need no backfill.
db.version(42).stores(storesV39).upgrade(async (tx) => {
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.definingResource === undefined) {
      await tx.table('regions').put(withDefiningResourceDefault(r))
    }
  }
})

// v43: Add POI.trade (worldgen economy). No index change needed — backfill null.
db.version(43).stores(storesV39).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.trade === undefined) {
      await tx.table('pois').put(withTradeDefault(poi))
    }
  }
})

const storesV46 = { ...storesV39, dooms: 'id, worldId, status' }

// v44: Wealth + story fields. Backfill POI.wealthBand, NPC.wealthTier, Region.front
// to null. No index change needed.
db.version(44).stores(storesV39).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.wealthBand === undefined) {
      await tx.table('pois').put(withWealthBandDefault(poi))
    }
  }
  const npcs = await tx.table('npcs').toArray()
  for (const npc of npcs) {
    if (npc.wealthTier === undefined) {
      await tx.table('npcs').put(withWealthTierDefault(npc))
    }
  }
  const regions = await tx.table('regions').toArray()
  for (const r of regions) {
    if (r.front === undefined) {
      await tx.table('regions').put(withFrontDefault(r))
    }
  }
})

// v45: Backfill POI.settlementFlavor from legacy stitched settlement descriptions;
// move the GM secret into gmNotes. No index change needed.
db.version(45).stores(storesV39).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.settlementFlavor === undefined) {
      await tx.table('pois').put(withSettlementFlavorBackfill(poi))
    }
  }
})

// v46: Add dooms table (Phase 6). New table only — no data backfill required.
db.version(46).stores(storesV46)

// Normalize Realms on read — ensures starred arrays have defaults
db.worlds.hook('reading', (realm) => {
  if (!realm) return realm
  const rec = realm as unknown as Record<string, unknown>
  let patched = false
  const defaults: Record<string, unknown> = {
    starredMonsterIds: [],
    starredSpellIds: [],
    starredMagicItemIds: [],
    hiddenCompendiumIds: [],
    moonCycleLength: 28,
  }
  for (const [key, val] of Object.entries(defaults)) {
    if (rec[key] === undefined) {
      if (!patched) { realm = { ...realm }; patched = true }
      ;(realm as unknown as Record<string, unknown>)[key] = val
    }
  }
  return realm
})

// Normalize POIs on read — ensures array fields added after initial creation have defaults
db.pois.hook('reading', (poi) => {
  if (!poi) return poi
  const rec = poi as unknown as Record<string, unknown>
  let patched = false
  const defaults: Record<string, unknown> = {
    tags: [],
    services: [],
    traps: [],
    treasure: [],
    sessionLog: [],
    monsterRefs: [],
    magicItemRefs: [],
    spellRefs: [],
    equipmentRefs: [],
    wanderingMonsters: [],
    encounterChance: null,
    watabouSeed: null,
    watabouGenerator: null,
    watabouData: null,
    spatialDungeon: null,
    dungeonGenOptions: null,
    ruinSite: null,
    landmarkLore: null,
    poiGenOptions: null,
    lastVisitedDate: null,
    dangerLevel: null,
    currentOccupant: null,
    trade: null,
    wealthBand: null,
  }
  for (const [key, val] of Object.entries(defaults)) {
    if (rec[key] === undefined) {
      if (!patched) { poi = { ...poi }; patched = true }
      ;(poi as unknown as Record<string, unknown>)[key] = val
    }
  }
  // Derive exploration status from the legacy `visited` flag when absent.
  if (rec.status === undefined) {
    if (!patched) { poi = { ...poi }; patched = true }
    ;(poi as unknown as Record<string, unknown>).status = rec.visited ? 'explored' : 'unexplored'
  }
  // Migrate wanderingMonsters from old string[] format to WanderingMonsterEntry[]
  const wm = rec.wanderingMonsters
  if (Array.isArray(wm) && wm.length > 0 && typeof wm[0] === 'string') {
    if (!patched) { poi = { ...poi }; patched = true }
    ;(poi as unknown as Record<string, unknown>).wanderingMonsters = (wm as string[]).map((s: string) => ({
      name: s, creatureType: '', count: '1', activity: '', compendiumId: null, npcId: null, customStats: null,
    }))
  }
  // Patch old WanderingMonsterEntry objects missing npcId/customStats/creatureType
  if (Array.isArray(wm) && wm.length > 0 && typeof wm[0] === 'object' && wm[0] !== null) {
    const needsPatch = wm.some((e: Record<string, unknown>) => e.npcId === undefined || e.creatureType === undefined)
    if (needsPatch) {
      if (!patched) { poi = { ...poi }; patched = true }
      ;(poi as unknown as Record<string, unknown>).wanderingMonsters = (wm as Record<string, unknown>[]).map((e) => ({
        ...e, npcId: e.npcId ?? null, customStats: e.customStats ?? null, creatureType: e.creatureType ?? '',
      }))
    }
  }
  return poi
})

// Normalize NPCs on read — ensures array fields have defaults
db.npcs.hook('reading', (npc) => {
  if (!npc) return npc
  const rec = npc as unknown as Record<string, unknown>
  let patched = false
  const defaults: Record<string, unknown> = {
    factionIds: [],
    traits: [],
    tags: [],
    wealthTier: null,
  }
  for (const [key, val] of Object.entries(defaults)) {
    if (rec[key] === undefined) {
      if (!patched) { npc = { ...npc }; patched = true }
      ;(npc as unknown as Record<string, unknown>)[key] = val
    }
  }
  // Normalize systemBlock sub-arrays
  if (rec.systemBlock) {
    const sb = rec.systemBlock as Record<string, unknown>
    if (sb.stats === undefined || sb.attacks === undefined || sb.inventory === undefined || sb.abilities === undefined) {
      if (!patched) { npc = { ...npc }; patched = true }
      ;(npc as unknown as Record<string, unknown>).systemBlock = {
        ...sb,
        stats: sb.stats ?? [],
        attacks: sb.attacks ?? [],
        inventory: sb.inventory ?? [],
        abilities: sb.abilities ?? [],
        notes: sb.notes ?? '',
      }
    }
  }
  // Backfill inventory item ids for existing records
  if (rec.systemBlock) {
    const sb = (npc as unknown as Record<string, unknown>).systemBlock as Record<string, unknown>
    const inv = (sb.inventory as Array<Record<string, unknown>> | undefined) ?? []
    if (inv.some((it) => it.id === undefined)) {
      npc = { ...npc }
      ;(npc as unknown as Record<string, unknown>).systemBlock = {
        ...sb,
        inventory: inv.map((it) => (it.id === undefined ? { ...it, id: newId() } : it)),
      }
    }
  }
  return npc
})

// Normalize Rumors on read — ensures sourceNpcId has a default
db.rumors.hook('reading', (rumor) => {
  if (!rumor) return rumor
  const rec = rumor as unknown as Record<string, unknown>
  if (rec.sourceNpcId === undefined) {
    rumor = { ...rumor }
    ;(rumor as unknown as Record<string, unknown>).sourceNpcId = null
  }
  return rumor
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
