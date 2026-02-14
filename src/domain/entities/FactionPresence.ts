import type { FactionPresenceType } from '@shared/constants'

export interface FactionPresence {
  id: string
  factionId: string
  poiId: string
  type: FactionPresenceType
  notes: string
  createdAt: number
  updatedAt: number
}
