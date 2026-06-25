import type { Path } from '@domain/entities/Path'
import type { PathType, TerrainType, Direction } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface BuildPathInput {
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

// Pure Path factory shared by the create use-case and world generation, so both
// produce identically-shaped records with the same field defaults.
export function buildPath(input: BuildPathInput): Path {
  const now = Date.now()
  return {
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
}
