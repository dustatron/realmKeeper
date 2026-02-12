import type { SystemBlock } from '@domain/value-objects/SystemBlock'

export interface NPC {
  id: string
  realmId: string
  name: string
  factionId: string | null
  regionId: string | null
  description: string
  traits: string[]
  motivation: string
  appearance: string
  voice: string
  tags: string[]
  systemBlock: SystemBlock
  isAlive: boolean
  createdAt: number
  updatedAt: number
}
