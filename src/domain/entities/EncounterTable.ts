import type { EncounterCategory } from '@shared/constants'
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'

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
  /** Last rolled cascade result (persisted so it survives reloads). */
  lastResult?: EncounterRollResult | null
  createdAt: number
  updatedAt: number
}
