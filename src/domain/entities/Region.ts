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
  createdAt: number
  updatedAt: number
}
