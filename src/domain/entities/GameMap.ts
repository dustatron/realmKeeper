export interface GameMap {
  id: string
  name: string
  ownerRealmId: string | null
  ownerPoiId: string | null
  imageUrl: string
  width: number
  height: number
  sortOrder: number
  createdAt: number
  updatedAt: number
}
