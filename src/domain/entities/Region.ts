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
  /** Regional front: a mini progress-clock threat that advances when the region is ignored (worldgen). null = none. */
  front: { title: string; description: string; progress: number; segments: number } | null
  boundary: { x: number; y: number }[] | null
  color: string | null
  imageUrl: string | null
  createdAt: number
  updatedAt: number
}
