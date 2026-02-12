import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'

export async function executeUpdatePOI(
  poi: POI,
  deps: { poiRepo: IPOIRepository }
): Promise<void> {
  await deps.poiRepo.update({ ...poi, updatedAt: Date.now() })
}
