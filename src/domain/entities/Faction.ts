import type { FactionStatus } from '@shared/constants'

export interface AgendaGoal {
  id: string
  description: string
  completed: boolean
}

export interface Advantage {
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
  agentNpcIds: string[]
  agendaGoals: AgendaGoal[]
  advantages: Advantage[]
  traits: string[]
  createdAt: number
  updatedAt: number
}
