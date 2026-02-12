import type { IRegionRepository } from '@application/ports/IRegionRepository'

export async function executeDeleteRegion(
  regionId: string,
  deps: { regionRepo: IRegionRepository }
): Promise<void> {
  await deps.regionRepo.delete(regionId)
}
