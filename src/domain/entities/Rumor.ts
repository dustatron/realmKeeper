import type { EntityLink } from '@domain/value-objects/EntityLink'

export interface Rumor {
  id: string
  poiId: string | null
  regionId: string | null
  worldId: string
  text: string
  source: string
  isUsed: boolean
  isQuestHook: boolean
  /** GM's read on whether the rumor is true. Undefined = unverified. */
  reliability?: 'true' | 'uncertain' | 'false'
  hookId: string | null
  /** GM-added links to related POIs/NPCs. */
  links?: EntityLink[]
  sourceNpcId?: string | null
  tags: string[]
  createdAt: number
  updatedAt: number
}
