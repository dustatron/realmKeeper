import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Region } from '@domain/entities/Region'
import { newId } from '@shared/ulid'

export interface CreateRegionInput {
  realmId: string
  name: string
  description?: string
  terrain?: string
}

export async function executeCreateRegion(
  input: CreateRegionInput,
  deps: { regionRepo: IRegionRepository }
): Promise<Region> {
  const now = Date.now()
  const region: Region = {
    id: newId(),
    realmId: input.realmId,
    name: input.name,
    description: input.description ?? '',
    terrain: input.terrain ?? '',
    features: [],
    dangers: [],
    settlements: [],
    resources: [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.regionRepo.create(region)
  return region
}
