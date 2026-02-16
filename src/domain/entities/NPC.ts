import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { LifeStatus, MovementStatus, NPCRace } from '@shared/constants'

export interface NPC {
  id: string
  worldId: string
  name: string
  race?: NPCRace
  factionIds: string[]
  regionId: string | null
  poiId: string | null
  lifeStatus: LifeStatus
  movementStatus: MovementStatus
  description: string
  traits: string[]
  motivation: string
  appearance: string
  voice: string
  want: string
  tags: string[]
  imageUrl: string | null
  systemBlock: SystemBlock
  createdAt: number
  updatedAt: number
}
