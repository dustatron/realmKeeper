import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import { db } from '@infrastructure/dexie/db'

export async function executeDeleteGameMap(
  mapId: string,
  deps: { gameMapRepo: IGameMapRepository; poiRepo: IPOIRepository }
): Promise<void> {
  // Clear mapRef and position on orphaned POIs
  const poisOnMap = await db.pois.where('mapRef').equals(mapId).toArray()
  for (const poi of poisOnMap) {
    await deps.poiRepo.update({
      ...poi,
      mapRef: null,
      position: null,
      updatedAt: Date.now(),
    })
  }
  await deps.gameMapRepo.delete(mapId)
}
