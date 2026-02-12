import type { Season, Watch } from '@shared/constants'

export interface WeatherHistory {
  id: string
  realmId: string
  year: number
  season: Season
  day: number
  watch: Watch
  condition: string
  severity: 'normal' | 'extreme' | 'catastrophic'
  createdAt: number
}
