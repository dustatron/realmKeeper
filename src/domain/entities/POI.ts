import type { PoiType } from '@shared/constants'

export interface POI {
  id: string
  regionId: string
  parentPoiId: string | null
  name: string
  description: string
  type: PoiType
  subtypeLabel: string | null
  floor: number | null
  tags: string[]
  position: { x: number; y: number } | null
  mapRef: string | null
  createdAt: number
  updatedAt: number
}
