import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Region } from '@domain/entities/Region'

export async function executeUpdateRegion(
  region: Region,
  deps: { regionRepo: IRegionRepository }
): Promise<void> {
  await deps.regionRepo.update({ ...region, updatedAt: Date.now() })
}
