export interface EncounterTable {
  id: string
  ownerPoiId: string | null
  ownerRegionId: string | null
  worldId: string
  creature: string[]
  signOmen: string[]
  loss: string[]
  npc: string[]
  discovery: string[]
  treasure: string[]
  createdAt: number
  updatedAt: number
}
