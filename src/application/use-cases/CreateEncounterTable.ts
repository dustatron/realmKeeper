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
  loss?: string[]
  npc?: string[]
  discovery?: string[]
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
    loss: input.loss ?? [],
    npc: input.npc ?? [],
    discovery: input.discovery ?? [],
    treasure: input.treasure ?? [],
    customSections: input.customSections ?? [],
    disabledCategories: input.disabledCategories ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.encounterTableRepo.create(table)
  return table
}
