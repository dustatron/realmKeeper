import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { FactionPresenceType } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface CreateFactionPresenceInput {
  factionId: string
  poiId: string
  type: FactionPresenceType
  notes?: string
}

export async function executeCreateFactionPresence(
  input: CreateFactionPresenceInput,
  deps: { factionPresenceRepo: IFactionPresenceRepository }
): Promise<FactionPresence> {
  const now = Date.now()
  const presence: FactionPresence = {
    id: newId(),
    factionId: input.factionId,
    poiId: input.poiId,
    type: input.type,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await deps.factionPresenceRepo.create(presence)
  return presence
}
