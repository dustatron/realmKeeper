import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { GeneratedDungeonData } from '@domain/value-objects/GeneratedDungeonData'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { POI } from '@domain/entities/POI'
import { newId } from '@shared/ulid'
import { executeDeletePOIWithChildren } from './DeletePOIWithChildren'
import {
  generateSpatialDungeon,
  resolveConfig,
  type DungeonGenerationConfig,
  type SpatialRoom,
  type GridRect,
} from '@generators/dungeon/index'

export interface RegenerateDungeonInput {
  dungeonPoiId: string
  config: DungeonGenerationConfig
}

export interface RegenerateDungeonDeps {
  poiRepo: IPOIRepository
  pathRepo: IPathRepository
  npcRepo: INPCRepository
  factionPresenceRepo: IFactionPresenceRepository
  poiEventRepo: IPOIEventRepository
}

export async function executeRegenerateDungeon(
  input: RegenerateDungeonInput,
  deps: RegenerateDungeonDeps
): Promise<void> {
  const { dungeonPoiId, config } = input

  const dungeonPoi = await deps.poiRepo.getById(dungeonPoiId)
  if (!dungeonPoi) throw new Error(`Dungeon POI not found: ${dungeonPoiId}`)

  // Delete existing child room POIs
  const children = await deps.poiRepo.getChildren(dungeonPoiId)
  for (const child of children) {
    const grandchildren = await deps.poiRepo.getChildren(child.id)
    await executeDeletePOIWithChildren(child.id, grandchildren.map(c => c.id), deps)
  }

  // Generate new layout
  const seed = newId()
  const resolved = resolveConfig(config, seed)
  const layout = generateSpatialDungeon(resolved, seed)

  const now = Date.now()

  const watabouData: GeneratedDungeonData = {
    type: 'spatial_dungeon',
    layout,
    config: resolved,
    generatedAt: now,
  }

  // Build updated description from ecology
  const ecology = layout.ecology
  const ecologyDesc = [
    ecology?.builderCulture ? `Built by ${ecology.builderCulture}.` : '',
    ecology?.currentInhabitants ? `Currently inhabited by ${ecology.currentInhabitants}.` : '',
  ].filter(Boolean).join(' ')

  const historyNotes = (ecology?.historyLayers ?? [])
    .map(l => `- **${l.era}**: ${l.builders} — ${l.fate} _(clues: ${l.clueTypes.join(', ')})_`)
    .join('\n')

  const wanderingMonsters: WanderingMonsterEntry[] = (layout.wanderingMonsters?.entries ?? []).map(e => ({
    name: e.creatureType,
    creatureType: e.creatureType,
    count: e.count,
    activity: e.activity,
    compendiumId: null,
    npcId: null,
    customStats: null,
  }))

  // Update dungeon POI
  const updatedDungeon: POI = {
    ...dungeonPoi,
    description: ecologyDesc || dungeonPoi.description,
    gmNotes: historyNotes,
    tags: [resolved.theme, resolved.size],
    wanderingMonsters,
    watabouData,
    updatedAt: now,
  }
  await deps.poiRepo.update(updatedDungeon)

  // Create new room POIs
  for (const room of layout.rooms) {
    const roomPoi = buildRoomPoi(room, dungeonPoiId, dungeonPoi.regionId, layout.rooms, layout.passages as PassageRef[], now)
    await deps.poiRepo.create(roomPoi)
  }
}

// ---- helpers (duplicated from GenerateDungeon to avoid cross-use-case imports) ----

interface PassageRef {
  fromRoomId: string
  toRoomId: string
  connectionType: string
}

function buildRoomPoi(
  room: SpatialRoom,
  dungeonPoiId: string,
  regionId: string,
  allRooms: SpatialRoom[],
  passages: PassageRef[],
  now: number
): POI {
  const connections = passages
    .filter(p => p.fromRoomId === room.id || p.toRoomId === room.id)
    .map(p => {
      const otherId = p.fromRoomId === room.id ? p.toRoomId : p.fromRoomId
      const other = allRooms.find(r => r.id === otherId)
      if (!other) return null
      const dir = inferPassageDirection(room.bounds, other.bounds)
      const num = allRooms.indexOf(other) + 1
      return `${dir} → ${num}. ${other.name}`
    })
    .filter(Boolean)
    .join(' | ')

  const traps: Trap[] = room.hazards.map(h => ({
    id: newId(),
    name: h.name,
    description: h.description,
    dc: null,
    damage: h.damage ?? '',
    disarmed: h.disarmed,
  }))

  const treasure: TreasureItem[] = room.treasure.map(t => ({
    id: newId(),
    name: t.name,
    description: t.description ?? t.name,
    value: t.value ?? '',
    quantity: 1,
    collected: t.looted,
  }))

  const featureLines = room.features.map(f => `- **${f.name}**: ${f.description}`).join('\n')
  const secretLines = room.secrets.map(s => `- 🔍 ${s.description} _(${s.trigger})_`).join('\n')
  const historyLines = (room.historicalClues ?? []).map(c => `- _${c}_`).join('\n')
  const discoveryLines = (room.discoveries ?? []).map(d => `- ${d.description}`).join('\n')
  const gmNotes = [featureLines, secretLines, historyLines, discoveryLines].filter(Boolean).join('\n\n')

  const roomIndex = allRooms.indexOf(room) + 1

  return {
    id: newId(),
    regionId,
    parentPoiId: dungeonPoiId,
    name: `${roomIndex}. ${room.name}`,
    description: connections || room.description,
    type: 'interior',
    subtypeLabel: room.id,
    floor: null,
    tags: [room.type, room.size],
    position: null,
    mapRef: null,
    markerColor: null,
    readAloud: room.description,
    gmNotes,
    trouble: '',
    mood: room.activity ?? '',
    sensory: '',
    services: [],
    imageUrl: null,
    locationSeed: null,
    traps,
    treasure,
    roomWidth: room.bounds.width * 5,
    roomLength: room.bounds.height * 5,
    visited: false,
    lightLevel: null,
    wanderingMonsters: [],
    watabouSeed: null,
    watabouGenerator: null,
    watabouData: null,
    sessionLog: [],
    starred: false,
    monsterRefs: [],
    magicItemRefs: [],
    spellRefs: [],
    equipmentRefs: [],
    createdAt: now,
    updatedAt: now,
  }
}

function inferPassageDirection(from: GridRect, to: GridRect): 'N' | 'S' | 'E' | 'W' {
  const dx = (to.x + to.width / 2) - (from.x + from.width / 2)
  const dy = (to.y + to.height / 2) - (from.y + from.height / 2)
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'E' : 'W'
  return dy > 0 ? 'S' : 'N'
}
