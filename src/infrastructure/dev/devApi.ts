/**
 * API exposed on window.__realmKeeper for Chrome MCP automation.
 * Receives the LiveStore store instance — no direct Dexie imports.
 * Available in all environments (dev + prod).
 */

import type { Store } from '@livestore/livestore'
import type { schema } from '@infrastructure/livestore/schema'
import {
  factionCreated,
  factionUpdated,
  factionDeleted,
  npcCreated,
  npcUpdated,
  npcDeleted,
  poiCreated,
  poiUpdated,
  poiDeleted,
  pathDeleted,
  factionPresenceDeleted,
  poiEventDeleted,
  regionCreated,
  regionUpdated,
  factionRelationshipCreated,
  factionRelationshipUpdated,
  customCompendiumEntryCreated,
  customCompendiumEntryUpdated,
} from '@infrastructure/livestore/events'
import { newId } from '@shared/ulid'
import type { Realm } from '@domain/entities/Realm'
import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { POI } from '@domain/entities/POI'
import type { Region } from '@domain/entities/Region'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): number {
  return Date.now()
}

function getActiveWorldId(): string | null {
  try {
    const raw = localStorage.getItem('rk-ui-store')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.activeRealmId ?? null
  } catch {
    return null
  }
}

function requireWorldId(worldId?: string): string {
  const id = worldId ?? getActiveWorldId()
  if (!id) throw new Error('No worldId provided and no active world detected')
  return id
}

// ---------------------------------------------------------------------------
// Worlds
// ---------------------------------------------------------------------------

function makeWorlds(store: Store<typeof schema>) {
  return {
    async list(): Promise<Pick<Realm, 'id' | 'name'>[]> {
      const all = store.query({ query: 'SELECT * FROM worlds', bindValues: {} }) as Realm[]
      return all.map((r) => ({ id: r.id, name: r.name }))
    },

    async get(id: string): Promise<Realm | undefined> {
      const rows = store.query({ query: 'SELECT * FROM worlds WHERE id = $id', bindValues: { $id: id } }) as Realm[]
      return rows[0] ?? undefined
    },

    activeWorldId(): string | null {
      return getActiveWorldId()
    },
  }
}

// ---------------------------------------------------------------------------
// Cascade delete helper (used by pois.delete / pois.deleteChildren)
// ---------------------------------------------------------------------------

async function cascadeDeletePoi(store: Store<typeof schema>, id: string): Promise<void> {
  // Recurse into children first
  const children = store.query({ query: 'SELECT * FROM pois WHERE parentPoiId = $id', bindValues: { $id: id } }) as POI[]
  for (const child of children) {
    await cascadeDeletePoi(store, child.id)
  }
  // Unlink NPCs
  const linkedNpcs = store.query({ query: 'SELECT * FROM npcs WHERE poiId = $id', bindValues: { $id: id } }) as NPC[]
  for (const npc of linkedNpcs) {
    store.commit(npcUpdated({ ...npc, poiId: null, updatedAt: now() } as any))
  }
  // Delete paths referencing this POI
  const pathsFrom = store.query({ query: 'SELECT * FROM paths WHERE fromPoiId = $id', bindValues: { $id: id } }) as Array<{ id: string }>
  const pathsTo = store.query({ query: 'SELECT * FROM paths WHERE toPoiId = $id', bindValues: { $id: id } }) as Array<{ id: string }>
  const pathIds = new Set([...pathsFrom, ...pathsTo].map((p) => p.id))
  for (const pid of pathIds) {
    store.commit(pathDeleted({ id: pid }))
  }
  // Delete faction presences
  const presences = store.query({ query: 'SELECT * FROM factionPresences WHERE poiId = $id', bindValues: { $id: id } }) as Array<{ id: string }>
  for (const fp of presences) {
    store.commit(factionPresenceDeleted({ id: fp.id }))
  }
  // Delete POI events
  const events = store.query({ query: 'SELECT * FROM poiEvents WHERE poiId = $id', bindValues: { $id: id } }) as Array<{ id: string }>
  for (const ev of events) {
    store.commit(poiEventDeleted({ id: ev.id }))
  }
  // Delete the POI
  store.commit(poiDeleted({ id }))
}

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

function makeFactions(store: Store<typeof schema>) {
  return {
    async list(worldId?: string): Promise<Faction[]> {
      const wid = requireWorldId(worldId)
      return store.query({ query: 'SELECT * FROM factions WHERE worldId = $wid', bindValues: { $wid: wid } }) as Faction[]
    },

    async get(id: string): Promise<Faction | undefined> {
      const rows = store.query({ query: 'SELECT * FROM factions WHERE id = $id', bindValues: { $id: id } }) as Faction[]
      return rows[0] ?? undefined
    },

    async add(
      data: Pick<Faction, 'worldId' | 'name'> & Partial<Omit<Faction, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<Faction> {
      const ts = now()
      const faction: Faction = {
        id: newId(),
        worldId: data.worldId,
        name: data.name,
        description: data.description ?? '',
        type: data.type ?? '',
        status: data.status ?? 'active',
        isParty: data.isParty ?? false,
        regionId: data.regionId ?? null,
        headquartersPoiId: data.headquartersPoiId ?? null,
        leaderNpcId: data.leaderNpcId ?? null,
        agentNpcIds: data.agentNpcIds ?? [],
        agendaGoals: data.agendaGoals ?? [],
        advantages: data.advantages ?? [],
        obstacles: data.obstacles ?? [],
        traits: data.traits ?? [],
        sortOrder: data.sortOrder ?? 0,
        createdAt: ts,
        updatedAt: ts,
      }
      store.commit(factionCreated(faction as any))
      return faction
    },

    async update(id: string, partial: Partial<Omit<Faction, 'id' | 'createdAt'>>): Promise<Faction> {
      const rows = store.query({ query: 'SELECT * FROM factions WHERE id = $id', bindValues: { $id: id } }) as Faction[]
      const existing = rows[0]
      if (!existing) throw new Error(`Faction ${id} not found`)
      const updated = { ...existing, ...partial, updatedAt: now() }
      store.commit(factionUpdated(updated as any))
      return updated
    },

    async delete(id: string): Promise<void> {
      store.commit(factionDeleted({ id }))
    },
  }
}

// ---------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------

function makeNpcs(store: Store<typeof schema>) {
  return {
    async list(worldId?: string): Promise<NPC[]> {
      const wid = requireWorldId(worldId)
      return store.query({ query: 'SELECT * FROM npcs WHERE worldId = $wid', bindValues: { $wid: wid } }) as NPC[]
    },

    async get(id: string): Promise<NPC | undefined> {
      const rows = store.query({ query: 'SELECT * FROM npcs WHERE id = $id', bindValues: { $id: id } }) as NPC[]
      return rows[0] ?? undefined
    },

    async add(
      data: Pick<NPC, 'worldId' | 'name'> & Partial<Omit<NPC, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<NPC> {
      const ts = now()
      const npc: NPC = {
        id: newId(),
        worldId: data.worldId,
        name: data.name,
        race: data.race,
        factionIds: data.factionIds ?? [],
        regionId: data.regionId ?? null,
        poiId: data.poiId ?? null,
        lifeStatus: data.lifeStatus ?? 'alive',
        movementStatus: data.movementStatus ?? 'present',
        description: data.description ?? '',
        traits: data.traits ?? [],
        motivation: data.motivation ?? '',
        appearance: data.appearance ?? '',
        voice: data.voice ?? '',
        want: data.want ?? '',
        tags: data.tags ?? [],
        imageUrl: data.imageUrl ?? null,
        systemBlock: data.systemBlock ?? {
          stats: [],
          hp: 0,
          maxHp: 0,
          armor: 0,
          attacks: [],
          inventory: [],
          abilities: [],
          notes: '',
        },
        starred: data.starred ?? false,
        createdAt: ts,
        updatedAt: ts,
      }
      store.commit(npcCreated(npc as any))
      return npc
    },

    async update(id: string, partial: Partial<Omit<NPC, 'id' | 'createdAt'>>): Promise<NPC> {
      const rows = store.query({ query: 'SELECT * FROM npcs WHERE id = $id', bindValues: { $id: id } }) as NPC[]
      const existing = rows[0]
      if (!existing) throw new Error(`NPC ${id} not found`)
      const updated = { ...existing, ...partial, updatedAt: now() }
      store.commit(npcUpdated(updated as any))
      return updated
    },

    async delete(id: string): Promise<void> {
      store.commit(npcDeleted({ id }))
    },
  }
}

// ---------------------------------------------------------------------------
// POIs
// ---------------------------------------------------------------------------

function makePois(store: Store<typeof schema>) {
  return {
    async list(regionId?: string): Promise<POI[]> {
      if (regionId) {
        return store.query({ query: 'SELECT * FROM pois WHERE regionId = $regionId', bindValues: { $regionId: regionId } }) as POI[]
      }
      const wid = requireWorldId()
      const regions = store.query({ query: 'SELECT * FROM regions WHERE worldId = $wid', bindValues: { $wid: wid } }) as Array<{ id: string }>
      if (regions.length === 0) return []
      const ids = regions.map((r) => `'${r.id}'`).join(', ')
      return store.query({ query: `SELECT * FROM pois WHERE regionId IN (${ids})`, bindValues: {} }) as POI[]
    },

    async listByWorld(worldId?: string): Promise<POI[]> {
      const wid = requireWorldId(worldId)
      const regions = store.query({ query: 'SELECT * FROM regions WHERE worldId = $wid', bindValues: { $wid: wid } }) as Array<{ id: string }>
      if (regions.length === 0) return []
      const ids = regions.map((r) => `'${r.id}'`).join(', ')
      return store.query({ query: `SELECT * FROM pois WHERE regionId IN (${ids})`, bindValues: {} }) as POI[]
    },

    async get(id: string): Promise<POI | undefined> {
      const rows = store.query({ query: 'SELECT * FROM pois WHERE id = $id', bindValues: { $id: id } }) as POI[]
      return rows[0] ?? undefined
    },

    async add(
      data: Pick<POI, 'regionId' | 'name'> & Partial<Omit<POI, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<POI> {
      const ts = now()
      const poi: POI = {
        id: newId(),
        regionId: data.regionId,
        parentPoiId: data.parentPoiId ?? null,
        name: data.name,
        description: data.description ?? '',
        type: data.type ?? 'other',
        subtypeLabel: data.subtypeLabel ?? null,
        floor: data.floor ?? null,
        tags: data.tags ?? [],
        position: data.position ?? null,
        mapRef: data.mapRef ?? null,
        markerColor: data.markerColor ?? null,
        readAloud: data.readAloud ?? '',
        gmNotes: data.gmNotes ?? '',
        trouble: data.trouble ?? '',
        mood: data.mood ?? '',
        sensory: data.sensory ?? '',
        services: data.services ?? [],
        imageUrl: data.imageUrl ?? null,
        monsterRefs: data.monsterRefs ?? [],
        magicItemRefs: data.magicItemRefs ?? [],
        spellRefs: data.spellRefs ?? [],
        equipmentRefs: data.equipmentRefs ?? [],
        locationSeed: data.locationSeed ?? null,
        traps: data.traps ?? [],
        treasure: data.treasure ?? [],
        roomWidth: data.roomWidth ?? null,
        roomLength: data.roomLength ?? null,
        visited: data.visited ?? false,
        lightLevel: data.lightLevel ?? null,
        wanderingMonsters: data.wanderingMonsters ?? [],
        watabouSeed: data.watabouSeed ?? null,
        watabouGenerator: data.watabouGenerator ?? null,
        watabouData: data.watabouData ?? null,
        spatialDungeon: data.spatialDungeon ?? null,
        dungeonGenOptions: data.dungeonGenOptions ?? null,
        sessionLog: data.sessionLog ?? [],
        starred: data.starred ?? false,
        createdAt: ts,
        updatedAt: ts,
      }
      store.commit(poiCreated(poi as any))
      return poi
    },

    async update(id: string, partial: Partial<Omit<POI, 'id' | 'createdAt'>>): Promise<POI> {
      const rows = store.query({ query: 'SELECT * FROM pois WHERE id = $id', bindValues: { $id: id } }) as POI[]
      const existing = rows[0]
      if (!existing) throw new Error(`POI ${id} not found`)
      const updated = { ...existing, ...partial, updatedAt: now() }
      store.commit(poiUpdated(updated as any))
      return updated
    },

    async listChildren(parentPoiId: string): Promise<POI[]> {
      return store.query({ query: 'SELECT * FROM pois WHERE parentPoiId = $parentPoiId', bindValues: { $parentPoiId: parentPoiId } }) as POI[]
    },

    async delete(id: string): Promise<void> {
      await cascadeDeletePoi(store, id)
    },

    async deleteChildren(parentPoiId: string): Promise<number> {
      const children = store.query({ query: 'SELECT * FROM pois WHERE parentPoiId = $parentPoiId', bindValues: { $parentPoiId: parentPoiId } }) as POI[]
      for (const child of children) {
        await cascadeDeletePoi(store, child.id)
      }
      return children.length
    },
  }
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

function makeRegions(store: Store<typeof schema>) {
  return {
    async list(worldId?: string): Promise<Region[]> {
      const wid = requireWorldId(worldId)
      return store.query({ query: 'SELECT * FROM regions WHERE worldId = $wid', bindValues: { $wid: wid } }) as Region[]
    },

    async get(id: string): Promise<Region | undefined> {
      const rows = store.query({ query: 'SELECT * FROM regions WHERE id = $id', bindValues: { $id: id } }) as Region[]
      return rows[0] ?? undefined
    },

    async add(
      data: Pick<Region, 'worldId' | 'name'> & Partial<Omit<Region, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<Region> {
      const ts = now()
      const region: Region = {
        id: newId(),
        worldId: data.worldId,
        name: data.name,
        description: data.description ?? '',
        terrain: data.terrain ?? '',
        features: data.features ?? [],
        dangers: data.dangers ?? [],
        settlements: data.settlements ?? [],
        resources: data.resources ?? [],
        boundary: data.boundary ?? null,
        color: data.color ?? null,
        imageUrl: data.imageUrl ?? null,
        createdAt: ts,
        updatedAt: ts,
      }
      store.commit(regionCreated(region as any))
      return region
    },

    async update(id: string, partial: Partial<Omit<Region, 'id' | 'createdAt'>>): Promise<Region> {
      const rows = store.query({ query: 'SELECT * FROM regions WHERE id = $id', bindValues: { $id: id } }) as Region[]
      const existing = rows[0]
      if (!existing) throw new Error(`Region ${id} not found`)
      const updated = { ...existing, ...partial, updatedAt: now() }
      store.commit(regionUpdated(updated as any))
      return updated
    },
  }
}

// ---------------------------------------------------------------------------
// Faction Relationships
// ---------------------------------------------------------------------------

function makeRelationships(store: Store<typeof schema>) {
  return {
    async list(factionId: string): Promise<FactionRelationship[]> {
      return store.query({ query: 'SELECT * FROM factionRelationships WHERE factionId = $factionId', bindValues: { $factionId: factionId } }) as FactionRelationship[]
    },

    async get(factionId: string, targetId: string): Promise<FactionRelationship | undefined> {
      const rows = store.query({
        query: 'SELECT * FROM factionRelationships WHERE factionId = $factionId AND targetId = $targetId LIMIT 1',
        bindValues: { $factionId: factionId, $targetId: targetId },
      }) as FactionRelationship[]
      return rows[0] ?? undefined
    },

    async set(
      factionId: string,
      targetId: string,
      score: number,
      eventDescription?: string,
    ): Promise<FactionRelationship> {
      const rows = store.query({
        query: 'SELECT * FROM factionRelationships WHERE factionId = $factionId AND targetId = $targetId LIMIT 1',
        bindValues: { $factionId: factionId, $targetId: targetId },
      }) as FactionRelationship[]
      const existing = rows[0]

      const ts = now()
      if (existing) {
        const newEvents = eventDescription
          ? [...existing.events, { description: eventDescription, scoreDelta: score - existing.score, timestamp: ts }]
          : existing.events
        const updated: FactionRelationship = { ...existing, score, events: newEvents, updatedAt: ts }
        store.commit(factionRelationshipUpdated(updated as any))
        return updated
      }

      const rel: FactionRelationship = {
        id: newId(),
        factionId,
        targetId,
        score,
        events: eventDescription ? [{ description: eventDescription, scoreDelta: score, timestamp: ts }] : [],
        updatedAt: ts,
      }
      store.commit(factionRelationshipCreated(rel as any))
      return rel
    },
  }
}

// ---------------------------------------------------------------------------
// Custom Compendium Entries
// ---------------------------------------------------------------------------

function makeCompendium(store: Store<typeof schema>) {
  return {
    async list(worldId?: string): Promise<CustomCompendiumEntry[]> {
      const wid = requireWorldId(worldId)
      return store.query({ query: 'SELECT * FROM customCompendiumEntries WHERE worldId = $wid', bindValues: { $wid: wid } }) as CustomCompendiumEntry[]
    },

    async listByKind(kind: CustomCompendiumEntry['kind'], worldId?: string): Promise<CustomCompendiumEntry[]> {
      const wid = requireWorldId(worldId)
      return store.query({
        query: 'SELECT * FROM customCompendiumEntries WHERE worldId = $wid AND kind = $kind',
        bindValues: { $wid: wid, $kind: kind },
      }) as CustomCompendiumEntry[]
    },

    async get(id: string): Promise<CustomCompendiumEntry | undefined> {
      const rows = store.query({ query: 'SELECT * FROM customCompendiumEntries WHERE id = $id', bindValues: { $id: id } }) as CustomCompendiumEntry[]
      return rows[0] ?? undefined
    },

    async add(
      data: Pick<CustomCompendiumEntry, 'worldId' | 'name' | 'kind'> &
        Partial<Omit<CustomCompendiumEntry, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<CustomCompendiumEntry> {
      const ts = now()
      const entry: CustomCompendiumEntry = {
        id: newId(),
        worldId: data.worldId,
        kind: data.kind,
        name: data.name,
        description: data.description ?? '',
        monsterData: data.monsterData,
        spellData: data.spellData,
        magicItemData: data.magicItemData,
        createdAt: ts,
        updatedAt: ts,
      }
      store.commit(customCompendiumEntryCreated(entry as any))
      return entry
    },

    async update(id: string, partial: Partial<Omit<CustomCompendiumEntry, 'id' | 'createdAt'>>): Promise<CustomCompendiumEntry> {
      const rows = store.query({ query: 'SELECT * FROM customCompendiumEntries WHERE id = $id', bindValues: { $id: id } }) as CustomCompendiumEntry[]
      const existing = rows[0]
      if (!existing) throw new Error(`CustomCompendiumEntry ${id} not found`)
      const updated = { ...existing, ...partial, updatedAt: now() }
      store.commit(customCompendiumEntryUpdated(updated as any))
      return updated
    },
  }
}

// ---------------------------------------------------------------------------
// Install on window
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __realmKeeper?: ReturnType<typeof buildApi>
  }
}

function buildApi(store: Store<typeof schema>) {
  return {
    worlds: makeWorlds(store),
    factions: makeFactions(store),
    npcs: makeNpcs(store),
    pois: makePois(store),
    regions: makeRegions(store),
    relationships: makeRelationships(store),
    compendium: makeCompendium(store),
  }
}

export function installDevApi(store: Store<typeof schema>): void {
  window.__realmKeeper = buildApi(store)
  console.log(
    '%c[RealmKeeper] Dev API installed → window.__realmKeeper',
    'color: #22d3ee; font-weight: bold',
  )
}
