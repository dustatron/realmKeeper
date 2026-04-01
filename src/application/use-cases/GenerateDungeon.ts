import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'
import type { GeneratedDungeonData } from '@domain/value-objects/GeneratedDungeonData'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import { newId } from '@shared/ulid'
import {
  generateSpatialDungeon,
  resolveConfig,
  type DungeonGenerationConfig,
  type ResolvedDungeonConfig,
  type SpatialRoom,
  type GridRect,
} from '@generators/dungeon/index'

export interface GenerateDungeonInput {
  name: string
  regionId: string
  connectedPoiId?: string | null
  config: DungeonGenerationConfig
}

export interface GenerateDungeonResult {
  dungeonPoi: POI
  roomPois: POI[]
  path?: Path
}

export interface GenerateDungeonDeps {
  poiRepo: IPOIRepository
  pathRepo: IPathRepository
}

export async function executeGenerateDungeon(
  input: GenerateDungeonInput,
  deps: GenerateDungeonDeps
): Promise<GenerateDungeonResult> {
  const seed = newId()
  const resolved = resolveConfig(input.config, seed)
  const layout = generateSpatialDungeon(resolved, seed)

  const now = Date.now()

  const watabouData: GeneratedDungeonData = {
    type: 'spatial_dungeon',
    layout,
    config: resolved,
    generatedAt: now,
  }

  // Build dungeon POI description from ecology
  const ecology = layout.ecology
  const ecologyDesc = [
    ecology?.builderCulture ? `Built by ${ecology.builderCulture}.` : '',
    ecology?.currentInhabitants ? `Currently inhabited by ${ecology.currentInhabitants}.` : '',
  ].filter(Boolean).join(' ')

  // Build gmNotes from history layers
  const historyNotes = (ecology?.historyLayers ?? [])
    .map(l => `- **${l.era}**: ${l.builders} — ${l.fate} _(clues: ${l.clueTypes.join(', ')})_`)
    .join('\n')

  // Map wandering monsters
  const wanderingMonsters: WanderingMonsterEntry[] = (layout.wanderingMonsters?.entries ?? []).map(e => ({
    name: e.creatureType,
    creatureType: e.creatureType,
    count: e.count,
    activity: e.activity,
    compendiumId: null,
    npcId: null,
    customStats: null,
  }))

  const dungeonPoi: POI = {
    id: newId(),
    regionId: input.regionId,
    parentPoiId: null,
    name: input.name || layout.name,
    description: ecologyDesc || layout.description,
    type: 'dungeon',
    subtypeLabel: null,
    floor: null,
    tags: [resolved.theme, resolved.size],
    position: null,
    mapRef: null,
    markerColor: null,
    readAloud: '',
    gmNotes: historyNotes,
    trouble: '',
    mood: '',
    sensory: '',
    services: [],
    imageUrl: null,
    locationSeed: null,
    traps: [],
    treasure: [],
    roomWidth: null,
    roomLength: null,
    visited: false,
    lightLevel: null,
    wanderingMonsters,
    watabouSeed: null,
    watabouGenerator: null,
    watabouData,
    sessionLog: [],
    starred: false,
    monsterRefs: [],
    magicItemRefs: [],
    spellRefs: [],
    equipmentRefs: [],
    createdAt: now,
    updatedAt: now,
  }

  // Create room POIs
  const roomPois: POI[] = layout.rooms.map(room =>
    buildRoomPoi(room, dungeonPoi.id, input.regionId, layout.rooms, layout.passages as Parameters<typeof buildRoomPoi>[4], now)
  )

  // Persist
  await deps.poiRepo.create(dungeonPoi)
  for (const rp of roomPois) {
    await deps.poiRepo.create(rp)
  }

  // Optional connecting path
  let path: Path | undefined
  if (input.connectedPoiId) {
    path = {
      id: newId(),
      fromPoiId: dungeonPoi.id,
      toPoiId: input.connectedPoiId,
      name: `Path to ${input.name || layout.name}`,
      description: '',
      type: 'trail',
      baseTravelWatches: 3,
      terrain: 'plains',
      direction: null,
      hasDoor: false,
      isLocked: false,
      doorDescription: '',
      createdAt: now,
      updatedAt: now,
    }
    await deps.pathRepo.create(path)
  }

  return { dungeonPoi, roomPois, path }
}

// ---- helpers ----

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
  // Build passage connections string
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

  // Map hazards → traps
  const traps: Trap[] = room.hazards.map(h => ({
    id: newId(),
    name: h.name,
    description: h.description,
    dc: null,
    damage: h.damage ?? '',
    disarmed: h.disarmed,
  }))

  // Map treasure
  const treasure: TreasureItem[] = room.treasure.map(t => ({
    id: newId(),
    name: t.name,
    description: t.description ?? t.name,
    value: t.value ?? '',
    quantity: 1,
    collected: t.looted,
  }))

  // Build gmNotes
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
    subtypeLabel: room.id, // hexbinder room ID for SVG click linking
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
