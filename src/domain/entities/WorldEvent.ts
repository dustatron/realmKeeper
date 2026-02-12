import type { Season, Watch } from '@shared/constants'

export interface WorldEvent {
  id: string
  realmId: string
  year: number
  season: Season
  day: number
  watch: Watch
  type: string
  title: string
  description: string
  relatedEntityIds: string[]
  createdAt: number
}
