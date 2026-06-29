import type { NoticeType } from '@shared/constants'
import type { EntityLink } from '@domain/value-objects/EntityLink'

export interface Notice {
  id: string
  poiId: string | null
  regionId: string | null
  worldId: string
  title: string
  description: string
  type: NoticeType
  reward: string
  contactNpcId: string | null
  hookId: string | null
  /** GM-added links to related POIs/NPCs. */
  links?: EntityLink[]
  isUsed: boolean
  tags: string[]
  createdAt: number
  updatedAt: number
}
