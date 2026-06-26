import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'
import { buildPOI, type BuildPOIInput } from '@domain/services/worldgen/buildPoi'

export type CreatePOIInput = BuildPOIInput

export async function executeCreatePOI(
  input: CreatePOIInput,
  deps: { poiRepo: IPOIRepository }
): Promise<POI> {
  const poi = buildPOI(input)
  await deps.poiRepo.create(poi)
  return poi
}
