import { makeSchema, State } from '@livestore/livestore'
import { events } from './events'
import {
  systemConfigsTable,
  worldsTable,
  regionsTable,
  factionsTable,
  npcsTable,
  factionRelationshipsTable,
  poisTable,
  pathsTable,
  realmNotesTable,
  worldEventsTable,
  weatherHistoryTable,
  tableSetsTable,
  tableDefsTable,
  rollHistoryTable,
  factionPresencesTable,
  poiEventsTable,
  gameMapsTable,
  rumorsTable,
  noticesTable,
  encounterTablesTable,
  entityNotesTable,
  customCompendiumEntriesTable,
} from './tables'

export const tables = {
  systemConfigs: systemConfigsTable,
  worlds: worldsTable,
  regions: regionsTable,
  factions: factionsTable,
  npcs: npcsTable,
  factionRelationships: factionRelationshipsTable,
  pois: poisTable,
  paths: pathsTable,
  realmNotes: realmNotesTable,
  worldEvents: worldEventsTable,
  weatherHistory: weatherHistoryTable,
  tableSets: tableSetsTable,
  tableDefs: tableDefsTable,
  rollHistory: rollHistoryTable,
  factionPresences: factionPresencesTable,
  poiEvents: poiEventsTable,
  gameMaps: gameMapsTable,
  rumors: rumorsTable,
  notices: noticesTable,
  encounterTables: encounterTablesTable,
  entityNotes: entityNotesTable,
  customCompendiumEntries: customCompendiumEntriesTable,
}

const state = State.SQLite.makeState({
  tables,
  materializers: {
    // SystemConfig
    'v1.SystemConfigCreated': (event) => systemConfigsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.SystemConfigUpdated': (event) => systemConfigsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.SystemConfigDeleted': ({ id }) => systemConfigsTable.delete().where({ id }),

    // World
    'v1.WorldCreated': (event) => worldsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.WorldUpdated': (event) => worldsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.WorldDeleted': ({ id }) => worldsTable.delete().where({ id }),

    // Region
    'v1.RegionCreated': (event) => regionsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.RegionUpdated': (event) => regionsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.RegionDeleted': ({ id }) => regionsTable.delete().where({ id }),

    // Faction
    'v1.FactionCreated': (event) => factionsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.FactionUpdated': (event) => factionsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.FactionDeleted': ({ id }) => factionsTable.delete().where({ id }),

    // Npc
    'v1.NpcCreated': (event) => npcsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.NpcUpdated': (event) => npcsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.NpcDeleted': ({ id }) => npcsTable.delete().where({ id }),

    // FactionRelationship
    'v1.FactionRelationshipCreated': (event) => factionRelationshipsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.FactionRelationshipUpdated': (event) => factionRelationshipsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.FactionRelationshipDeleted': ({ id }) => factionRelationshipsTable.delete().where({ id }),

    // Poi
    'v1.PoiCreated': (event) => poisTable.insert(event as any).onConflict('id', 'replace'),
    'v1.PoiUpdated': (event) => poisTable.insert(event as any).onConflict('id', 'replace'),
    'v1.PoiDeleted': ({ id }) => poisTable.delete().where({ id }),

    // Path
    'v1.PathCreated': (event) => pathsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.PathUpdated': (event) => pathsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.PathDeleted': ({ id }) => pathsTable.delete().where({ id }),

    // RealmNote
    'v1.RealmNoteCreated': (event) => realmNotesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.RealmNoteUpdated': (event) => realmNotesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.RealmNoteDeleted': ({ id }) => realmNotesTable.delete().where({ id }),

    // WorldEvent (no update — append-only)
    'v1.WorldEventCreated': (event) => worldEventsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.WorldEventDeleted': ({ id }) => worldEventsTable.delete().where({ id }),

    // WeatherHistory (no update — append-only)
    'v1.WeatherHistoryCreated': (event) => weatherHistoryTable.insert(event as any).onConflict('id', 'replace'),
    'v1.WeatherHistoryDeleted': ({ id }) => weatherHistoryTable.delete().where({ id }),

    // TableSet
    'v1.TableSetCreated': (event) => tableSetsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.TableSetUpdated': (event) => tableSetsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.TableSetDeleted': ({ id }) => tableSetsTable.delete().where({ id }),

    // TableDef
    'v1.TableDefCreated': (event) => tableDefsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.TableDefUpdated': (event) => tableDefsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.TableDefDeleted': ({ id }) => tableDefsTable.delete().where({ id }),

    // RollHistory (insert only)
    'v1.RollHistoryCreated': (event) => rollHistoryTable.insert(event as any).onConflict('id', 'replace'),

    // FactionPresence
    'v1.FactionPresenceCreated': (event) => factionPresencesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.FactionPresenceUpdated': (event) => factionPresencesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.FactionPresenceDeleted': ({ id }) => factionPresencesTable.delete().where({ id }),

    // PoiEvent
    'v1.PoiEventCreated': (event) => poiEventsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.PoiEventUpdated': (event) => poiEventsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.PoiEventDeleted': ({ id }) => poiEventsTable.delete().where({ id }),

    // GameMap
    'v1.GameMapCreated': (event) => gameMapsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.GameMapUpdated': (event) => gameMapsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.GameMapDeleted': ({ id }) => gameMapsTable.delete().where({ id }),

    // Rumor
    'v1.RumorCreated': (event) => rumorsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.RumorUpdated': (event) => rumorsTable.insert(event as any).onConflict('id', 'replace'),
    'v1.RumorDeleted': ({ id }) => rumorsTable.delete().where({ id }),

    // Notice
    'v1.NoticeCreated': (event) => noticesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.NoticeUpdated': (event) => noticesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.NoticeDeleted': ({ id }) => noticesTable.delete().where({ id }),

    // EncounterTable
    'v1.EncounterTableCreated': (event) => encounterTablesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.EncounterTableUpdated': (event) => encounterTablesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.EncounterTableDeleted': ({ id }) => encounterTablesTable.delete().where({ id }),

    // EntityNote
    'v1.EntityNoteCreated': (event) => entityNotesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.EntityNoteUpdated': (event) => entityNotesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.EntityNoteDeleted': ({ id }) => entityNotesTable.delete().where({ id }),

    // CustomCompendiumEntry
    'v1.CustomCompendiumEntryCreated': (event) => customCompendiumEntriesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.CustomCompendiumEntryUpdated': (event) => customCompendiumEntriesTable.insert(event as any).onConflict('id', 'replace'),
    'v1.CustomCompendiumEntryDeleted': ({ id }) => customCompendiumEntriesTable.delete().where({ id }),
  },
})

export const schema = makeSchema({ events, state })

export { events }

export default schema
