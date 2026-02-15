export interface EncounterTable {
  id: string
  ownerPoiId: string | null
  ownerRegionId: string | null
  realmId: string
  creature: string[]
  signOmen: string[]
  loss: string[]
  npc: string[]
  discovery: string[]
  treasure: string[]
  createdAt: number
  updatedAt: number
}
