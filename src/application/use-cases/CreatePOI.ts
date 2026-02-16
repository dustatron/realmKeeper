import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import { newId } from '@shared/ulid'

export interface CreatePOIInput {
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
}

export async function executeCreatePOI(
  input: CreatePOIInput,
  deps: { poiRepo: IPOIRepository }
): Promise<POI> {
  const now = Date.now()
  const poi: POI = {
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
    monsterRefs: [],
    magicItemRefs: [],
    spellRefs: [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.poiRepo.create(poi)
  return poi
}
