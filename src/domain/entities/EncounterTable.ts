import type { EncounterCategory } from '@shared/constants'

export interface CustomEncounterSection {
  id: string
  name: string
  entries: string[]
}

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
  customSections: CustomEncounterSection[]
  disabledCategories: EncounterCategory[]
  createdAt: number
  updatedAt: number
}
