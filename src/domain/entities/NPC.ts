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
  /** Quick GM-facing details: mannerism, a carried item, a secret, etc. */
  notable?: string
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
  /** Personal wealth tier, derived from the settlement's wealth band at generation. null = ungenerated. */
  wealthTier: 'destitute' | 'poor' | 'middling' | 'wealthy' | null
  starred: boolean
  createdAt: number
  updatedAt: number
}
