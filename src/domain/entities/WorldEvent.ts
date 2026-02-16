import type { Season } from '@shared/constants'

export interface WorldEvent {
  id: string
  worldId: string
  year: number
  season: Season
  day: number
  watch: number
  type: string
  title: string
  description: string
  relatedEntityIds: string[]
  createdAt: number
}
