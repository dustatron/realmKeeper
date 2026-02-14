import type { PathType, TerrainType } from '@shared/constants'

export interface Path {
  id: string
  fromPoiId: string
  toPoiId: string
  name: string
  description: string
  type: PathType
  baseTravelWatches: number
  terrain: TerrainType
  createdAt: number
  updatedAt: number
}
