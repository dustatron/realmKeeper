import type { IPathRepository } from '@application/ports/IPathRepository'
import type { Path } from '@domain/entities/Path'
import type { PathType, TerrainType, Direction } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface CreatePathInput {
  fromPoiId: string
  toPoiId: string
  name: string
  description?: string
  type?: PathType
  baseTravelWatches: number
  terrain?: TerrainType
  direction?: Direction | null
  hasDoor?: boolean
  isLocked?: boolean
  doorDescription?: string
}

export async function executeCreatePath(
  input: CreatePathInput,
  deps: { pathRepo: IPathRepository }
): Promise<Path> {
  const now = Date.now()
  const path: Path = {
    id: newId(),
    fromPoiId: input.fromPoiId,
    toPoiId: input.toPoiId,
    name: input.name,
    description: input.description ?? '',
    type: input.type ?? 'road',
    baseTravelWatches: input.baseTravelWatches,
    terrain: input.terrain ?? 'plains',
    direction: input.direction ?? null,
    hasDoor: input.hasDoor ?? false,
    isLocked: input.isLocked ?? false,
    doorDescription: input.doorDescription ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await deps.pathRepo.create(path)
  return path
}
