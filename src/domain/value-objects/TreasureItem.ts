export interface TreasureItem {
  id: string
  name: string
  description: string
  value: string // e.g. "500 gp", "priceless"
  quantity: number
  collected: boolean
}
