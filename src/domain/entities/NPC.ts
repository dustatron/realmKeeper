import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { Disposition, LifeStatus, MovementStatus } from '@shared/constants'

export interface NPC {
  id: string
  worldId: string
  name: string
  race?: string
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
  /** A personal goal/hook for this NPC (varied per NPC). */
  want: string
  /** For faction members: what they're currently doing for the faction. */
  factionAction?: string
  tags: string[]
  imageUrl: string | null
  systemBlock: SystemBlock
  disposition?: Disposition
  starred: boolean
  createdAt: number
  updatedAt: number
}
