import type { IPOIRepository } from '@application/ports/IPOIRepository'

export async function executeRemovePOIFromMap(
  poiId: string,
  deps: { poiRepo: IPOIRepository }
): Promise<void> {
  const poi = await deps.poiRepo.getById(poiId)
  if (!poi) throw new Error(`POI not found: ${poiId}`)
  await deps.poiRepo.update({
    ...poi,
    mapRef: null,
    position: null,
    updatedAt: Date.now(),
  })
}
