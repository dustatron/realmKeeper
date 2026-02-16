import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { RealmExport, GameMapExport } from './ExportRealm'
import { newId } from '@shared/ulid'

export interface ImportRealmDeps {
  realmRepo: IRealmRepository
  regionRepo: IRegionRepository
  factionRepo: IFactionRepository
  npcRepo: INPCRepository
  relationshipRepo: IFactionRelationshipRepository
  worldEventRepo: IWorldEventRepository
  weatherRepo: IWeatherRepository
  realmNoteRepo: IRealmNoteRepository
  poiRepo: IPOIRepository
  pathRepo: IPathRepository
  factionPresenceRepo: IFactionPresenceRepository
  poiEventRepo: IPOIEventRepository
  gameMapRepo: IGameMapRepository
}

// Accept v1, v2, or v3 exports for backward compat
type ImportData =
  | RealmExport
  | (Omit<RealmExport, 'version' | 'factionPresences' | 'poiEvents' | 'gameMaps'> & {
      version: 2
      factionPresences: RealmExport['factionPresences']
      poiEvents: RealmExport['poiEvents']
      gameMaps?: never
    })
  | (Omit<RealmExport, 'version' | 'factionPresences' | 'poiEvents' | 'gameMaps'> & {
      version: 1
      factionPresences?: never
      poiEvents?: never
      gameMaps?: never
    })

export async function executeImportRealm(
  data: ImportData,
  deps: ImportRealmDeps
): Promise<string> {
  // Build ID remap table
  const idMap = new Map<string, string>()
  const remap = (oldId: string): string => {
    if (!idMap.has(oldId)) idMap.set(oldId, newId())
    return idMap.get(oldId)!
  }

  // Realm
  const worldId = remap(data.realm.id)
  await deps.realmRepo.create({
    ...data.realm,
    id: worldId,
    daysPerWeek: data.realm.daysPerWeek ?? 7,
    watchesPerDay: data.realm.watchesPerDay ?? 3,
    completedThroughDay: data.realm.completedThroughDay ?? -1,
    updatedAt: Date.now(),
  })

  // Regions
  for (const r of data.regions) {
    const regionData = r as unknown as Record<string, unknown>
    await deps.regionRepo.create({
      ...r,
      id: remap(r.id),
      worldId,
      features: (regionData.features as string[]) ?? [],
      dangers: (regionData.dangers as string[]) ?? [],
      settlements: (regionData.settlements as string[]) ?? [],
      resources: (regionData.resources as string[]) ?? [],
      imageUrl: (regionData.imageUrl as string) ?? null,
    } as Parameters<typeof deps.regionRepo.create>[0])
  }

  // Factions
  for (const f of data.factions) {
    await deps.factionRepo.create({
      ...f,
      id: remap(f.id),
      worldId,
      agentNpcIds: f.agentNpcIds.map((id: string) => remap(id)),
      agendaGoals: f.agendaGoals.map((g) => ({ ...g, id: remap(g.id), timeframe: g.timeframe ?? 'long-term', progress: g.progress ?? 0, segments: g.segments ?? 4 })),
      advantages: f.advantages.map((a) => ({ ...a, id: remap(a.id) })),
      obstacles: (f.obstacles ?? []).map((o: { id: string; description: string }) => ({ ...o, id: remap(o.id) })),
      leaderNpcId: f.leaderNpcId ? remap(f.leaderNpcId) : null,
      regionId: f.regionId ? remap(f.regionId) : null,
      headquartersPoiId: f.headquartersPoiId ? remap(f.headquartersPoiId) : null,
      sortOrder: f.sortOrder ?? 0,
    })
  }

  // NPCs — handle v1 backward compat (location → poiId, isAlive → lifeStatus)
  for (const n of data.npcs) {
    const npcData = n as unknown as Record<string, unknown>
    await deps.npcRepo.create({
      ...n,
      id: remap(n.id),
      worldId,
      factionId: n.factionId ? remap(n.factionId) : null,
      regionId: n.regionId ? remap(n.regionId) : null,
      // v1 had `location` string, v2 has `poiId` — default poiId to null for old exports
      poiId: npcData.poiId ? remap(npcData.poiId as string) : null,
      // v1 had `isAlive` boolean, v2 has `lifeStatus` enum
      lifeStatus: npcData.lifeStatus
        ? (npcData.lifeStatus as string)
        : (npcData.isAlive === false ? 'dead' : 'alive'),
      movementStatus: (npcData.movementStatus as string) ?? 'present',
    } as Parameters<typeof deps.npcRepo.create>[0])
  }

  // Relationships
  for (const rel of data.relationships) {
    await deps.relationshipRepo.create({
      ...rel,
      id: remap(rel.id),
      factionId: remap(rel.factionId),
      targetId: remap(rel.targetId),
    })
  }

  // World events
  for (const e of data.worldEvents) {
    await deps.worldEventRepo.create({
      ...e,
      id: remap(e.id),
      worldId,
      relatedEntityIds: e.relatedEntityIds.map((id: string) => remap(id)),
    })
  }

  // Weather
  for (const w of data.weatherHistory) {
    await deps.weatherRepo.create({ ...w, id: remap(w.id), worldId })
  }

  // Notes
  for (const n of data.realmNotes) {
    await deps.realmNoteRepo.create({ ...n, id: remap(n.id), worldId })
  }

  // POIs — remap parentPoiId for v2
  for (const p of data.pois) {
    const poiData = p as unknown as Record<string, unknown>
    await deps.poiRepo.create({
      ...p,
      id: remap(p.id),
      regionId: remap(p.regionId),
      parentPoiId: poiData.parentPoiId ? remap(poiData.parentPoiId as string) : null,
      imageUrl: (poiData.imageUrl as string) ?? null,
    } as Parameters<typeof deps.poiRepo.create>[0])
  }

  // Paths — v2 removed regionId
  for (const p of data.paths) {
    const pathData = p as unknown as Record<string, unknown>
    await deps.pathRepo.create({
      ...p,
      id: remap(p.id),
      fromPoiId: remap(p.fromPoiId),
      toPoiId: remap(p.toPoiId),
      // v1 had baseTravelDays, v2 has baseTravelWatches
      baseTravelWatches: (pathData.baseTravelWatches as number) ?? (pathData.baseTravelDays as number) ?? 1,
      type: (pathData.type as string) ?? 'road',
      terrain: (pathData.terrain as string) ?? 'plains',
    } as Parameters<typeof deps.pathRepo.create>[0])
  }

  // Faction presences (v2 only)
  const factionPresences = data.factionPresences ?? []
  for (const fp of factionPresences) {
    await deps.factionPresenceRepo.create({
      ...fp,
      id: remap(fp.id),
      factionId: remap(fp.factionId),
      poiId: remap(fp.poiId),
    })
  }

  // POI events (v2+)
  const poiEvents = data.poiEvents ?? []
  for (const evt of poiEvents) {
    await deps.poiEventRepo.create({
      ...evt,
      id: remap(evt.id),
      poiId: remap(evt.poiId),
      worldId,
    })
  }

  // Game maps (v3+)
  const gameMaps: GameMapExport[] = (data as { gameMaps?: GameMapExport[] }).gameMaps ?? []
  for (const gm of gameMaps) {
    // Convert base64 back to data URL
    const imageUrl = `data:image/png;base64,${gm.imageBase64}`

    await deps.gameMapRepo.create({
      id: remap(gm.id),
      name: gm.name,
      ownerRealmId: gm.ownerRealmId ? remap(gm.ownerRealmId) : null,
      ownerPoiId: gm.ownerPoiId ? remap(gm.ownerPoiId) : null,
      imageUrl,
      width: gm.width,
      height: gm.height,
      sortOrder: gm.sortOrder,
      createdAt: gm.createdAt,
      updatedAt: gm.updatedAt,
    })
  }

  // Remap mapRef on POIs (update after maps are imported)
  for (const p of data.pois) {
    const poiData = p as unknown as Record<string, unknown>
    if (poiData.mapRef) {
      const newPoiId = remap(p.id)
      const poi = await deps.poiRepo.getById(newPoiId)
      if (poi) {
        await deps.poiRepo.update({
          ...poi,
          mapRef: remap(poiData.mapRef as string),
        })
      }
    }
  }

  return worldId
}
