export interface RealmNote {
  id: string
  realmId: string
  title: string
  content: string
  isMain: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}
