import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import type { DungeonGenOptions } from '~/lib/dungeon/types'
import type { RuinSite } from '@domain/entities/RuinSite'
import type { LandmarkLore } from '@domain/entities/LandmarkLore'
import { newId } from '@shared/ulid'

export interface BuildPOIInput {
  regionId: string
  parentPoiId?: string | null
  name: string
  description?: string
  type: PoiType
  subtypeLabel?: string | null
  floor?: number | null
  tags?: string[]
  position?: { x: number; y: number } | null
  mapRef?: string | null
  markerColor?: string | null
  readAloud?: string
  gmNotes?: string
  trouble?: string
  mood?: string
  sensory?: string
  services?: Service[]
  locationSeed?: LocationSeed | null
  dungeonGenOptions?: DungeonGenOptions | null
  ruinSite?: RuinSite | null
  landmarkLore?: LandmarkLore | null
  poiGenOptions?: { seed: string } | null
  dangerLevel?: number | null
  currentOccupant?: string | null
  trade?: { produces: string; needs: string[] } | null
}

export function buildPOI(input: BuildPOIInput): POI {
  const now = Date.now()
  return {
    id: newId(),
    regionId: input.regionId,
    parentPoiId: input.parentPoiId ?? null,
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    subtypeLabel: input.subtypeLabel ?? null,
    floor: input.floor ?? null,
    tags: input.tags ?? [],
    position: input.position ?? null,
    mapRef: input.mapRef ?? null,
    markerColor: input.markerColor ?? null,
    readAloud: input.readAloud ?? '',
    gmNotes: input.gmNotes ?? '',
    trouble: input.trouble ?? '',
    mood: input.mood ?? '',
    sensory: input.sensory ?? '',
    services: input.services ?? [],
    imageUrl: null,
    locationSeed: input.locationSeed ?? null,
    traps: [],
    treasure: [],
    roomWidth: null,
    roomLength: null,
    visited: false,
    status: 'unexplored',
    lastVisitedDate: null,
    dangerLevel: input.dangerLevel ?? null,
    currentOccupant: input.currentOccupant ?? null,
    trade: input.trade ?? null,
    lightLevel: null,
    wanderingMonsters: [],
    encounterChance: null,
    watabouSeed: null,
    watabouGenerator: null,
    watabouData: null,
    spatialDungeon: null,
    dungeonGenOptions: input.dungeonGenOptions ?? null,
    ruinSite: input.ruinSite ?? null,
    landmarkLore: input.landmarkLore ?? null,
    poiGenOptions: input.poiGenOptions ?? null,
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
