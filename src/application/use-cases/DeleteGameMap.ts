import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'

export async function executeDeleteGameMap(
  mapId: string,
  deps: { gameMapRepo: IGameMapRepository; poiRepo: IPOIRepository }
): Promise<void> {
  // Clear mapRef and position on orphaned POIs
  const poisOnMap = await deps.poiRepo.getByMapRef(mapId)
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
