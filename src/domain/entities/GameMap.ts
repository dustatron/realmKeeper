export interface GameMap {
  id: string
  name: string
  ownerRealmId: string | null
  ownerPoiId: string | null
  imageUrl: string
  kind: 'image' | 'hex'
  hexCols: number | null
  hexRows: number | null
  hexSize: number | null
  hexOrientation: 'pointy' | 'flat' | null
  width: number
  height: number
  sortOrder: number
  createdAt: number
  updatedAt: number
}
