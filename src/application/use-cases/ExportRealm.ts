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
import type { Realm } from '@domain/entities/Realm'
import type { Region } from '@domain/entities/Region'
import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'
import type { RealmNote } from '@domain/entities/RealmNote'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'

export interface ExportRealmDeps {
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

export interface RealmExport {
  version: 1
  exportedAt: number
  realm: Realm
  regions: Region[]
  factions: Faction[]
  npcs: NPC[]
  relationships: FactionRelationship[]
  worldEvents: WorldEvent[]
  weatherHistory: WeatherHistory[]
  realmNotes: RealmNote[]
  pois: POI[]
  paths: Path[]
}

export async function executeExportRealm(
  realmId: string,
  deps: ExportRealmDeps
): Promise<RealmExport | null> {
  const realm = await deps.realmRepo.getById(realmId)
  if (!realm) return null

  const regions = await deps.regionRepo.getByRealmId(realmId)
  const factions = await deps.factionRepo.getByRealmId(realmId)
  const npcs = await deps.npcRepo.getByRealmId(realmId)
  const factionIds = factions.map((f) => f.id)
  const relationships = await deps.relationshipRepo.getAllForRealm(realmId, factionIds)
  const worldEvents = await deps.worldEventRepo.getByRealmId(realmId)
  const weatherHistory = await deps.weatherRepo.getRecent(realmId, 9999)
  const realmNotes = await deps.realmNoteRepo.getByRealmId(realmId)

  // POIs and paths per region
  const allPois = await Promise.all(regions.map((r) => deps.poiRepo.getByRegionId(r.id)))
  const allPaths = await Promise.all(regions.map((r) => deps.pathRepo.getByRegionId(r.id)))

  return {
    version: 1,
    exportedAt: Date.now(),
    realm,
    regions,
    factions,
    npcs,
    relationships,
    worldEvents,
    weatherHistory,
    realmNotes,
    pois: allPois.flat(),
    paths: allPaths.flat(),
  }
}
