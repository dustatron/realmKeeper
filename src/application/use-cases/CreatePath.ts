import type { IPathRepository } from '@application/ports/IPathRepository'
import type { Path } from '@domain/entities/Path'
import { newId } from '@shared/ulid'

export interface CreatePathInput {
  regionId: string
  fromPoiId: string
  toPoiId: string
  name: string
  description?: string
  baseTravelDays: number
  terrain?: string
}

export async function executeCreatePath(
  input: CreatePathInput,
  deps: { pathRepo: IPathRepository }
): Promise<Path> {
  const now = Date.now()
  const path: Path = {
    id: newId(),
    regionId: input.regionId,
    fromPoiId: input.fromPoiId,
    toPoiId: input.toPoiId,
    name: input.name,
    description: input.description ?? '',
    baseTravelDays: input.baseTravelDays,
    terrain: input.terrain ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await deps.pathRepo.create(path)
  return path
}
