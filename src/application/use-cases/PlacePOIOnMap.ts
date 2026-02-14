import type { IPOIRepository } from '@application/ports/IPOIRepository'

export interface PlacePOIOnMapInput {
  poiId: string
  mapId: string
  position: { x: number; y: number }
}

export async function executePlacePOIOnMap(
  input: PlacePOIOnMapInput,
  deps: { poiRepo: IPOIRepository }
): Promise<void> {
  const poi = await deps.poiRepo.getById(input.poiId)
  if (!poi) throw new Error(`POI not found: ${input.poiId}`)
  await deps.poiRepo.update({
    ...poi,
    mapRef: input.mapId,
    position: input.position,
    updatedAt: Date.now(),
  })
}
