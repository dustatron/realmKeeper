import type { Season, Watch } from '@shared/constants'

export interface Realm {
  id: string
  name: string
  systemId: string
  description: string
  currentYear: number
  currentSeason: Season
  currentDay: number
  currentWatch: Watch
  daysPerSeason: number
  factionTurnTrigger: 'day' | 'week' | 'manual'
  createdAt: number
  updatedAt: number
}
