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
  daysPerWeek: number
  watchesPerDay: number
  factionTurnTrigger: 'day' | 'week' | 'manual'
  completedThroughDay: number
  createdAt: number
  updatedAt: number
}
