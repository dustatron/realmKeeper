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
import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type { IHookRepository } from '@application/ports/IHookRepository'
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
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { GameMap, HexCell } from '@domain/entities/GameMap'
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'

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
  factionPresenceRepo: IFactionPresenceRepository
  poiEventRepo: IPOIEventRepository
  gameMapRepo: IGameMapRepository
  connectionRepo: IConnectionRepository
  hookRepo: IHookRepository
}

export interface GameMapExport {
  id: string
  name: string
  ownerRealmId: string | null
  ownerPoiId: string | null
  imageBase64: string
  width: number
  height: number
  sortOrder: number
  createdAt: number
  updatedAt: number
  // Map shape — generated overworlds are kind:'hex' with no image. Preserving
  // these lets a hex map survive export/import instead of degrading to a blank
  // image map.
  kind: GameMap['kind']
  hexCols: number | null
  hexRows: number | null
  hexSize: number | null
  hexOrientation: GameMap['hexOrientation']
  hexCells: HexCell[] | null
}

export interface RealmExport {
  version: 4
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
  factionPresences: FactionPresence[]
  poiEvents: POIEvent[]
  gameMaps: GameMapExport[]
  connections: Connection[]
  hooks: Hook[]
}

async function imageUrlToBase64(url: string): Promise<string> {
  // No image (e.g. a generated hex map has imageUrl='') — nothing to encode.
  // Without this guard fetch('') resolves to the app's own index.html and the
  // export stores page HTML as the map image.
  if (!url) return ''
  // data URL — extract raw base64 directly
  if (url.startsWith('data:')) {
    return url.split(',')[1] ?? ''
  }
  // Remote URL (Cloudinary etc.) — fetch and convert
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function executeExportRealm(
  worldId: string,
  deps: ExportRealmDeps
): Promise<RealmExport | null> {
  const realm = await deps.realmRepo.getById(worldId)
  if (!realm) return null

  const regions = await deps.regionRepo.getByRealmId(worldId)
  const factions = await deps.factionRepo.getByRealmId(worldId)
  const npcs = await deps.npcRepo.getByRealmId(worldId)
  const factionIds = factions.map((f) => f.id)
  const relationships = await deps.relationshipRepo.getAllForRealm(worldId, factionIds)
  const worldEvents = await deps.worldEventRepo.getByRealmId(worldId)
  const weatherHistory = await deps.weatherRepo.getRecent(worldId, 9999)
  const realmNotes = await deps.realmNoteRepo.getByRealmId(worldId)

  // POIs per region, paths per POI (deduplicated)
  const allPois = await Promise.all(regions.map((r) => deps.poiRepo.getByRegionId(r.id)))
  const flatPoisForPaths = allPois.flat()
  const pathArrays = await Promise.all(flatPoisForPaths.map((p) => deps.pathRepo.getByPoi(p.id)))
  const pathDedup = new Map<string, (typeof pathArrays)[0][0]>()
  for (const arr of pathArrays) {
    for (const p of arr) pathDedup.set(p.id, p)
  }

  // Faction presences and POI events per POI
  const flatPois = allPois.flat()
  const allPresences = await Promise.all(flatPois.map((p) => deps.factionPresenceRepo.getByPoiId(p.id)))
  const poiEvents = await deps.poiEventRepo.getByRealmId(worldId)

  // Game maps — realm-owned + POI-owned
  const realmMaps = await deps.gameMapRepo.getByRealmId(worldId)
  const poiMapArrays = await Promise.all(flatPois.map((p) => deps.gameMapRepo.getByPoiId(p.id)))
  const allMaps = [...realmMaps, ...poiMapArrays.flat()]
  const mapDedup = new Map<string, GameMap>()
  for (const m of allMaps) mapDedup.set(m.id, m)

  const gameMaps: GameMapExport[] = await Promise.all(
    [...mapDedup.values()].map(async (m) => ({
      id: m.id,
      name: m.name,
      ownerRealmId: m.ownerRealmId,
      ownerPoiId: m.ownerPoiId,
      imageBase64: await imageUrlToBase64(m.imageUrl),
      width: m.width,
      height: m.height,
      sortOrder: m.sortOrder,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      kind: m.kind,
      hexCols: m.hexCols,
      hexRows: m.hexRows,
      hexSize: m.hexSize,
      hexOrientation: m.hexOrientation,
      hexCells: m.hexCells ?? null,
    }))
  )

  const connections = await deps.connectionRepo.getByWorld(worldId)
  const hooks = await deps.hookRepo.getByWorld(worldId)

  return {
    version: 4,
    exportedAt: Date.now(),
    realm,
    regions,
    factions,
    npcs,
    relationships,
    worldEvents,
    weatherHistory,
    realmNotes,
    pois: flatPois,
    paths: [...pathDedup.values()],
    factionPresences: allPresences.flat(),
    poiEvents,
    gameMaps,
    connections,
    hooks,
  }
}
