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
  moonCycleLength: number
  factionTurnTrigger: 'day' | 'week' | 'manual'
  /** Draw NPC names from the large expanded pool (vs. the system name tables).
   * On by default; may be undefined on realms created before this field existed. */
  expandedNames?: boolean
  completedThroughDay: number
  customRaces: string[]
  raceColors: Record<string, string>
  starredMonsterIds: string[]
  starredSpellIds: string[]
  starredMagicItemIds: string[]
  hiddenCompendiumIds: string[]
  createdAt: number
  updatedAt: number
}
