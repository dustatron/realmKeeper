import type { FactionStatus } from '@shared/constants'

export type AgendaTimeframe = 'immediate' | 'long-term'

export interface AgendaGoal {
  id: string
  description: string
  completed: boolean
  timeframe: AgendaTimeframe
  progress?: number
  segments?: number
}

export interface Advantage {
  id: string
  description: string
}

export interface Obstacle {
  id: string
  description: string
}

export interface Faction {
  id: string
  realmId: string
  name: string
  description: string
  type: string
  status: FactionStatus
  isParty: boolean
  regionId: string | null
  headquartersPoiId: string | null
  agentNpcIds: string[]
  agendaGoals: AgendaGoal[]
  advantages: Advantage[]
  obstacles: Obstacle[]
  traits: string[]
  sortOrder: number
  createdAt: number
  updatedAt: number
}
