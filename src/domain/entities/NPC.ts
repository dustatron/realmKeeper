import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { LifeStatus, MovementStatus } from '@shared/constants'

export interface NPC {
  id: string
  realmId: string
  name: string
  factionId: string | null
  regionId: string | null
  poiId: string | null
  lifeStatus: LifeStatus
  movementStatus: MovementStatus
  description: string
  traits: string[]
  motivation: string
  appearance: string
  voice: string
  tags: string[]
  systemBlock: SystemBlock
  createdAt: number
  updatedAt: number
}
