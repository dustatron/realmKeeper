export interface Region {
  id: string
  worldId: string
  name: string
  description: string
  terrain: string
  features: string[]
  dangers: string[]
  settlements: string[]
  resources: string[]
  /** Single resource that defines this region's economy/identity (worldgen). Null for older or non-generated regions. */
  definingResource: string | null
  people: string[]
  problem: string
  boundary: { x: number; y: number }[] | null
  color: string | null
  imageUrl: string | null
  createdAt: number
  updatedAt: number
}
