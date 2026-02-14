export interface Region {
  id: string
  realmId: string
  name: string
  description: string
  terrain: string
  features: string[]
  dangers: string[]
  settlements: string[]
  resources: string[]
  boundary: { x: number; y: number }[] | null
  color: string | null
  createdAt: number
  updatedAt: number
}
