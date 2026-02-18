import type { Season } from '@shared/constants'

export interface Realm {
  id: string
  name: string
  systemId: string
  description: string
  currentYear: number
  currentSeason: Season
  currentDay: number
  currentWatch: number
  daysPerSeason: number
  daysPerWeek: number
  watchesPerDay: number
  factionTurnTrigger: 'day' | 'week' | 'manual'
  completedThroughDay: number
  customRaces: string[]
  raceColors: Record<string, string>
  createdAt: number
  updatedAt: number
}
