import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface CreatePOIInput {
  regionId: string
  name: string
  description?: string
  type: PoiType
  tags?: string[]
}

export async function executeCreatePOI(
  input: CreatePOIInput,
  deps: { poiRepo: IPOIRepository }
): Promise<POI> {
  const now = Date.now()
  const poi: POI = {
    id: newId(),
    regionId: input.regionId,
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.poiRepo.create(poi)
  return poi
}
