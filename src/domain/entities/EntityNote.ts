export interface EntityNote {
  id: string
  ownerType: 'poi' | 'region'
  ownerId: string
  worldId: string
  title: string
  content: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}
