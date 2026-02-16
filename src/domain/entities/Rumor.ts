export interface Rumor {
  id: string
  poiId: string | null
  regionId: string | null
  worldId: string
  text: string
  source: string
  isUsed: boolean
  isQuestHook: boolean
  tags: string[]
  createdAt: number
  updatedAt: number
}
