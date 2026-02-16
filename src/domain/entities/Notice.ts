import type { NoticeType } from '@shared/constants'

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
  isUsed: boolean
  tags: string[]
  createdAt: number
  updatedAt: number
}
