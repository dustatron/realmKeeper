import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { Faction } from '@domain/entities/Faction'
import { newId } from '@shared/ulid'

export interface CreateFactionInput {
  worldId: string
  name: string
  description?: string
  type?: string
}

export async function executeCreateFaction(
  input: CreateFactionInput,
  deps: { factionRepo: IFactionRepository }
): Promise<Faction> {
  const now = Date.now()
  const faction: Faction = {
    id: newId(),
    worldId: input.worldId,
    name: input.name,
    description: input.description ?? '',
    type: input.type ?? '',
    status: 'active',
    isParty: false,
    regionId: null,
    headquartersPoiId: null,
    leaderNpcId: null,
    agentNpcIds: [],
    agendaGoals: [],
    advantages: [],
    obstacles: [],
    traits: [],
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  }
  await deps.factionRepo.create(faction)
  return faction
}
