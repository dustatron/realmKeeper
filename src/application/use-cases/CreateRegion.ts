import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Region } from '@domain/entities/Region'
import { newId } from '@shared/ulid'

export interface CreateRegionInput {
  worldId: string
  name: string
  description?: string
  terrain?: string
  color?: string | null
}

export async function executeCreateRegion(
  input: CreateRegionInput,
  deps: { regionRepo: IRegionRepository }
): Promise<Region> {
  const now = Date.now()
  const region: Region = {
    id: newId(),
    worldId: input.worldId,
    name: input.name,
    description: input.description ?? '',
    terrain: input.terrain ?? '',
    features: [],
    dangers: [],
    settlements: [],
    resources: [],
    people: [],
    problem: '',
    boundary: null,
    color: input.color ?? null,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  }
  await deps.regionRepo.create(region)
  return region
}
