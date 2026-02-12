import type { PoiType } from '@shared/constants'

export interface POI {
  id: string
  regionId: string
  name: string
  description: string
  type: PoiType
  tags: string[]
  createdAt: number
  updatedAt: number
}
