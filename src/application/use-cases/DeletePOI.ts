import type { IPOIRepository } from '@application/ports/IPOIRepository'

export async function executeDeletePOI(
  poiId: string,
  deps: { poiRepo: IPOIRepository }
): Promise<void> {
  await deps.poiRepo.delete(poiId)
}
