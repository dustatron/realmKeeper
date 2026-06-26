import { db } from '@infrastructure/dexie/db'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { Realm } from '@domain/entities/Realm'

export class RealmRepository implements IRealmRepository {
  async getById(id: string): Promise<Realm | undefined> {
    return db.worlds.get(id)
  }

  async getAll(): Promise<Realm[]> {
    return db.worlds.toArray()
  }

  async create(realm: Realm): Promise<void> {
    await db.worlds.put(realm)
  }

  async update(realm: Realm): Promise<void> {
    await db.worlds.put(realm)
  }

  async delete(id: string): Promise<void> {
    // Cascade: a realm owns rows across ~20 tables. Some are indexed directly by
    // worldId; others hang off regions/POIs/factions. Delete them all in one
    // transaction so a realm is removed atomically (no orphaned rows left to
    // grow IndexedDB unbounded on the iPad PWA, and no half-deleted state).
    await db.transaction(
      'rw',
      [
        db.worlds, db.regions, db.factions, db.npcs, db.factionRelationships,
        db.pois, db.paths, db.realmNotes, db.worldEvents, db.weatherHistory,
        db.rollHistory, db.factionPresences, db.poiEvents, db.gameMaps,
        db.rumors, db.notices, db.encounterTables, db.entityNotes,
        db.customCompendiumEntries, db.connections, db.hooks,
      ],
      async () => {
        // Collect child keys before deleting the rows they're derived from.
        const regionIds = (await db.regions.where('worldId').equals(id).primaryKeys()) as string[]
        const factionIds = (await db.factions.where('worldId').equals(id).primaryKeys()) as string[]
        const poiIds = regionIds.length
          ? ((await db.pois.where('regionId').anyOf(regionIds).primaryKeys()) as string[])
          : []

        // Tables indexed directly by worldId.
        await db.regions.where('worldId').equals(id).delete()
        await db.factions.where('worldId').equals(id).delete()
        await db.npcs.where('worldId').equals(id).delete()
        await db.realmNotes.where('worldId').equals(id).delete()
        await db.worldEvents.where('worldId').equals(id).delete()
        await db.weatherHistory.where('worldId').equals(id).delete()
        await db.rollHistory.where('worldId').equals(id).delete()
        await db.poiEvents.where('worldId').equals(id).delete()
        await db.rumors.where('worldId').equals(id).delete()
        await db.notices.where('worldId').equals(id).delete()
        await db.encounterTables.where('worldId').equals(id).delete()
        await db.entityNotes.where('worldId').equals(id).delete()
        await db.customCompendiumEntries.where('worldId').equals(id).delete()
        await db.connections.where('worldId').equals(id).delete()
        await db.hooks.where('worldId').equals(id).delete()

        // Tables scoped through factions.
        if (factionIds.length) {
          await db.factionRelationships.where('factionId').anyOf(factionIds).delete()
          await db.factionRelationships.where('targetId').anyOf(factionIds).delete()
          await db.factionPresences.where('factionId').anyOf(factionIds).delete()
        }

        // Tables scoped through POIs (which carry the realm's regionId — this
        // also covers dungeon room POIs, building POIs, their paths and maps).
        if (poiIds.length) {
          await db.pois.where('regionId').anyOf(regionIds).delete()
          await db.paths.where('fromPoiId').anyOf(poiIds).delete()
          await db.paths.where('toPoiId').anyOf(poiIds).delete()
          await db.factionPresences.where('poiId').anyOf(poiIds).delete()
          await db.gameMaps.where('ownerPoiId').anyOf(poiIds).delete()
        }

        // Realm-owned maps + the realm row itself.
        await db.gameMaps.where('ownerRealmId').equals(id).delete()
        await db.worlds.delete(id)
      },
    )
  }
}
