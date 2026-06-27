/**
 * API exposed on window.__realmKeeper for Chrome MCP automation.
 * Imports Dexie db directly — bypasses React context / DI container.
 * Available in all environments (dev + prod).
 */

import { db } from '@infrastructure/dexie/db'
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

const worlds = {
  async list(): Promise<Pick<Realm, 'id' | 'name'>[]> {
    const all = await db.worlds.toArray()
    return all.map((r) => ({ id: r.id, name: r.name }))
  },

  async get(id: string): Promise<Realm | undefined> {
    return db.worlds.get(id)
  },

  activeWorldId(): string | null {
    return getActiveWorldId()
  },
}

// ---------------------------------------------------------------------------
// Cascade delete helper (used by pois.delete / pois.deleteChildren)
// ---------------------------------------------------------------------------

async function cascadeDeletePoi(id: string): Promise<void> {
  // Recurse into children first
  const children = await db.pois.where('parentPoiId').equals(id).toArray()
  for (const child of children) {
    await cascadeDeletePoi(child.id)
  }
  // Unlink NPCs
  const linkedNpcs = await db.npcs.where('poiId').equals(id).toArray()
  for (const npc of linkedNpcs) {
    await db.npcs.update(npc.id, { poiId: null, updatedAt: now() })
  }
  // Delete paths referencing this POI
  const pathsFrom = await db.paths.where('fromPoiId').equals(id).toArray()
  const pathsTo = await db.paths.where('toPoiId').equals(id).toArray()
  const pathIds = new Set([...pathsFrom, ...pathsTo].map((p) => p.id))
  for (const pid of pathIds) {
    await db.paths.delete(pid)
  }
  // Delete faction presences
  const presences = await db.factionPresences.where('poiId').equals(id).toArray()
  for (const fp of presences) {
    await db.factionPresences.delete(fp.id)
  }
  // Delete POI events
  const events = await db.poiEvents.where('poiId').equals(id).toArray()
  for (const ev of events) {
    await db.poiEvents.delete(ev.id)
  }
  // Delete the POI
  await db.pois.delete(id)
}

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

const factions = {
  async list(worldId?: string): Promise<Faction[]> {
    const wid = requireWorldId(worldId)
    return db.factions.where('worldId').equals(wid).toArray()
  },

  async get(id: string): Promise<Faction | undefined> {
    return db.factions.get(id)
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
    await db.factions.add(faction)
    return faction
  },

  async update(id: string, partial: Partial<Omit<Faction, 'id' | 'createdAt'>>): Promise<Faction> {
    const existing = await db.factions.get(id)
    if (!existing) throw new Error(`Faction ${id} not found`)
    const updated = { ...existing, ...partial, updatedAt: now() }
    await db.factions.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.factions.delete(id)
  },
}

// ---------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------

const npcs = {
  async list(worldId?: string): Promise<NPC[]> {
    const wid = requireWorldId(worldId)
    return db.npcs.where('worldId').equals(wid).toArray()
  },

  async get(id: string): Promise<NPC | undefined> {
    return db.npcs.get(id)
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
    await db.npcs.add(npc)
    return npc
  },

  async update(id: string, partial: Partial<Omit<NPC, 'id' | 'createdAt'>>): Promise<NPC> {
    const existing = await db.npcs.get(id)
    if (!existing) throw new Error(`NPC ${id} not found`)
    const updated = { ...existing, ...partial, updatedAt: now() }
    await db.npcs.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.npcs.delete(id)
  },
}

// ---------------------------------------------------------------------------
// POIs
// ---------------------------------------------------------------------------

const pois = {
  async list(regionId?: string): Promise<POI[]> {
    if (regionId) return db.pois.where('regionId').equals(regionId).toArray()
    // No regionId — return all POIs for active world via regions
    const wid = requireWorldId()
    const regionIds = (await db.regions.where('worldId').equals(wid).toArray()).map((r) => r.id)
    if (regionIds.length === 0) return []
    return db.pois.where('regionId').anyOf(regionIds).toArray()
  },

  async listByWorld(worldId?: string): Promise<POI[]> {
    const wid = requireWorldId(worldId)
    const regionIds = (await db.regions.where('worldId').equals(wid).toArray()).map((r) => r.id)
    if (regionIds.length === 0) return []
    return db.pois.where('regionId').anyOf(regionIds).toArray()
  },

  async get(id: string): Promise<POI | undefined> {
    return db.pois.get(id)
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
      encounterChance: data.encounterChance ?? null,
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
    await db.pois.add(poi)
    return poi
  },

  async update(id: string, partial: Partial<Omit<POI, 'id' | 'createdAt'>>): Promise<POI> {
    const existing = await db.pois.get(id)
    if (!existing) throw new Error(`POI ${id} not found`)
    const updated = { ...existing, ...partial, updatedAt: now() }
    await db.pois.put(updated)
    return updated
  },

  async listChildren(parentPoiId: string): Promise<POI[]> {
    return db.pois.where('parentPoiId').equals(parentPoiId).toArray()
  },

  async delete(id: string): Promise<void> {
    await cascadeDeletePoi(id)
  },

  async deleteChildren(parentPoiId: string): Promise<number> {
    const children = await db.pois.where('parentPoiId').equals(parentPoiId).toArray()
    for (const child of children) {
      await cascadeDeletePoi(child.id)
    }
    return children.length
  },
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

const regions = {
  async list(worldId?: string): Promise<Region[]> {
    const wid = requireWorldId(worldId)
    return db.regions.where('worldId').equals(wid).toArray()
  },

  async get(id: string): Promise<Region | undefined> {
    return db.regions.get(id)
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
      people: data.people ?? [],
      boundary: data.boundary ?? null,
      color: data.color ?? null,
      imageUrl: data.imageUrl ?? null,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.regions.add(region)
    return region
  },

  async update(id: string, partial: Partial<Omit<Region, 'id' | 'createdAt'>>): Promise<Region> {
    const existing = await db.regions.get(id)
    if (!existing) throw new Error(`Region ${id} not found`)
    const updated = { ...existing, ...partial, updatedAt: now() }
    await db.regions.put(updated)
    return updated
  },
}

// ---------------------------------------------------------------------------
// Faction Relationships
// ---------------------------------------------------------------------------

const relationships = {
  async list(factionId: string): Promise<FactionRelationship[]> {
    return db.factionRelationships.where('factionId').equals(factionId).toArray()
  },

  async get(factionId: string, targetId: string): Promise<FactionRelationship | undefined> {
    return db.factionRelationships.where('[factionId+targetId]').equals([factionId, targetId]).first()
  },

  async set(
    factionId: string,
    targetId: string,
    score: number,
    eventDescription?: string,
  ): Promise<FactionRelationship> {
    const existing = await db.factionRelationships
      .where('[factionId+targetId]')
      .equals([factionId, targetId])
      .first()

    const ts = now()
    if (existing) {
      const newEvents = eventDescription
        ? [...existing.events, { description: eventDescription, scoreDelta: score - existing.score, timestamp: ts }]
        : existing.events
      const updated: FactionRelationship = { ...existing, score, events: newEvents, updatedAt: ts }
      await db.factionRelationships.put(updated)
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
    await db.factionRelationships.add(rel)
    return rel
  },
}

// ---------------------------------------------------------------------------
// Custom Compendium Entries
// ---------------------------------------------------------------------------

const compendium = {
  async list(worldId?: string): Promise<CustomCompendiumEntry[]> {
    const wid = requireWorldId(worldId)
    return db.customCompendiumEntries.where('worldId').equals(wid).toArray()
  },

  async listByKind(kind: CustomCompendiumEntry['kind'], worldId?: string): Promise<CustomCompendiumEntry[]> {
    const wid = requireWorldId(worldId)
    return db.customCompendiumEntries
      .where('worldId')
      .equals(wid)
      .filter((e) => e.kind === kind)
      .toArray()
  },

  async get(id: string): Promise<CustomCompendiumEntry | undefined> {
    return db.customCompendiumEntries.get(id)
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
    await db.customCompendiumEntries.add(entry)
    return entry
  },

  async update(id: string, partial: Partial<Omit<CustomCompendiumEntry, 'id' | 'createdAt'>>): Promise<CustomCompendiumEntry> {
    const existing = await db.customCompendiumEntries.get(id)
    if (!existing) throw new Error(`CustomCompendiumEntry ${id} not found`)
    const updated = { ...existing, ...partial, updatedAt: now() }
    await db.customCompendiumEntries.put(updated)
    return updated
  },
}

// ---------------------------------------------------------------------------
// Install on window
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __realmKeeper?: typeof api
  }
}

const api = { worlds, factions, npcs, pois, regions, relationships, compendium }

export function installDevApi(): void {
  window.__realmKeeper = api
  console.log(
    '%c[RealmKeeper] Dev API installed → window.__realmKeeper',
    'color: #22d3ee; font-weight: bold',
  )
}
