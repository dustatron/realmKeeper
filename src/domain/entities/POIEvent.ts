import type { Season } from '@shared/constants'
import type { POIEventType } from '@shared/constants'

export interface POIEvent {
  id: string
  poiId: string
  worldId: string
  name: string
  description: string
  type: POIEventType
  trigger: {
    year: number | null
    season: Season
    day: number
    watch: number | null
  }
  recurring: boolean
  durationWatches: number
  isActive: boolean
  effects: string
  tags: string[]
  createdAt: number
  updatedAt: number
}
