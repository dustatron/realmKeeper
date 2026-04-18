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
  people: string[]
  boundary: { x: number; y: number }[] | null
  color: string | null
  imageUrl: string | null
  createdAt: number
  updatedAt: number
}
