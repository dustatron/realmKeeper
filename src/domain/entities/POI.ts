import type { PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'

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
  markerColor: string | null
  readAloud: string
  gmNotes: string
  trouble: string
  mood: string
  sensory: string
  services: Service[]
  createdAt: number
  updatedAt: number
}
