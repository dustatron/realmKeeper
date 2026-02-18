import type { PathType, TerrainType, Direction } from '@shared/constants'

export interface Path {
  id: string
  fromPoiId: string
  toPoiId: string
  name: string
  description: string
  type: PathType
  baseTravelWatches: number
  terrain: TerrainType
  direction: Direction | null
  hasDoor: boolean
  isLocked: boolean
  doorDescription: string
  createdAt: number
  updatedAt: number
}
