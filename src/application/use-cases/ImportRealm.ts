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
import type { RealmExport } from './ExportRealm'
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
}

export async function executeImportRealm(
  data: RealmExport,
  deps: ImportRealmDeps
): Promise<string> {
  // Build ID remap table
  const idMap = new Map<string, string>()
  const remap = (oldId: string): string => {
    if (!idMap.has(oldId)) idMap.set(oldId, newId())
    return idMap.get(oldId)!
  }

  // Realm
  const realmId = remap(data.realm.id)
  await deps.realmRepo.create({
    ...data.realm,
    id: realmId,
    daysPerWeek: data.realm.daysPerWeek ?? 7,
    watchesPerDay: data.realm.watchesPerDay ?? 3,
    completedThroughDay: data.realm.completedThroughDay ?? -1,
    updatedAt: Date.now(),
  })

  // Regions
  for (const r of data.regions) {
    await deps.regionRepo.create({ ...r, id: remap(r.id), realmId })
  }

  // Factions
  for (const f of data.factions) {
    await deps.factionRepo.create({
      ...f,
      id: remap(f.id),
      realmId,
      agentNpcIds: f.agentNpcIds.map((id: string) => remap(id)),
      agendaGoals: f.agendaGoals.map((g) => ({ ...g, id: remap(g.id), timeframe: g.timeframe ?? 'long-term' })),
      advantages: f.advantages.map((a) => ({ ...a, id: remap(a.id) })),
      obstacles: (f.obstacles ?? []).map((o: { id: string; description: string }) => ({ ...o, id: remap(o.id) })),
      regionId: f.regionId ? remap(f.regionId) : null,
      headquartersPoiId: f.headquartersPoiId ? remap(f.headquartersPoiId) : null,
      sortOrder: f.sortOrder ?? 0,
    })
  }

  // NPCs
  for (const n of data.npcs) {
    await deps.npcRepo.create({
      ...n,
      id: remap(n.id),
      realmId,
      factionId: n.factionId ? remap(n.factionId) : null,
      regionId: n.regionId ? remap(n.regionId) : null,
      location: n.location ?? '',
    })
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
      realmId,
      relatedEntityIds: e.relatedEntityIds.map((id: string) => remap(id)),
    })
  }

  // Weather
  for (const w of data.weatherHistory) {
    await deps.weatherRepo.create({ ...w, id: remap(w.id), realmId })
  }

  // Notes
  for (const n of data.realmNotes) {
    await deps.realmNoteRepo.create({ ...n, id: remap(n.id), realmId })
  }

  // POIs
  for (const p of data.pois) {
    await deps.poiRepo.create({ ...p, id: remap(p.id), regionId: remap(p.regionId) })
  }

  // Paths
  for (const p of data.paths) {
    await deps.pathRepo.create({
      ...p,
      id: remap(p.id),
      regionId: remap(p.regionId),
      fromPoiId: remap(p.fromPoiId),
      toPoiId: remap(p.toPoiId),
    })
  }

  return realmId
}
