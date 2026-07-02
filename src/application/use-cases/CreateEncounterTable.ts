import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterTable, CustomEncounterSection } from '@domain/entities/EncounterTable'
import type { EncounterCategory } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface CreateEncounterTableInput {
  ownerPoiId?: string | null
  ownerRegionId?: string | null
  worldId: string
  creature?: string[]
  signOmen?: string[]
  areaEffect?: string[]
  loss?: string[]
  npc?: string[]
  treasure?: string[]
  customSections?: CustomEncounterSection[]
  disabledCategories?: EncounterCategory[]
}

export async function executeCreateEncounterTable(
  input: CreateEncounterTableInput,
  deps: { encounterTableRepo: IEncounterTableRepository }
): Promise<EncounterTable> {
  const now = Date.now()
  const table: EncounterTable = {
    id: newId(),
    ownerPoiId: input.ownerPoiId ?? null,
    ownerRegionId: input.ownerRegionId ?? null,
    worldId: input.worldId,
    creature: input.creature ?? [],
    signOmen: input.signOmen ?? [],
    areaEffect: input.areaEffect ?? [],
    loss: input.loss ?? [],
    npc: input.npc ?? [],
    treasure: input.treasure ?? [],
    customSections: input.customSections ?? [],
    disabledCategories: input.disabledCategories ?? [],
    lastResult: null,
    createdAt: now,
    updatedAt: now,
  }
  await deps.encounterTableRepo.create(table)
  return table
}
