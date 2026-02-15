import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import { newId } from '@shared/ulid'

export interface CreateEncounterTableInput {
  ownerPoiId?: string | null
  ownerRegionId?: string | null
  realmId: string
  creature?: string[]
  signOmen?: string[]
  loss?: string[]
  npc?: string[]
  discovery?: string[]
  treasure?: string[]
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
    realmId: input.realmId,
    creature: input.creature ?? [],
    signOmen: input.signOmen ?? [],
    loss: input.loss ?? [],
    npc: input.npc ?? [],
    discovery: input.discovery ?? [],
    treasure: input.treasure ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.encounterTableRepo.create(table)
  return table
}
