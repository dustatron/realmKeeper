import type { Season } from '@shared/constants'

export interface WeatherHistory {
  id: string
  worldId: string
  year: number
  season: Season
  day: number
  watch: number
  condition: string
  severity: 'normal' | 'extreme' | 'catastrophic'
  createdAt: number
}
