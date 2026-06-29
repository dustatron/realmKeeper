import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { Rumor } from '@domain/entities/Rumor'
import type { EntityLink } from '@domain/value-objects/EntityLink'
import { newId } from '@shared/ulid'

export interface CreateRumorInput {
  poiId?: string | null
  regionId?: string | null
  worldId: string
  text: string
  source?: string
  isQuestHook?: boolean
  links?: EntityLink[]
  tags?: string[]
}

export async function executeCreateRumor(
  input: CreateRumorInput,
  deps: { rumorRepo: IRumorRepository }
): Promise<Rumor> {
  const now = Date.now()
  const rumor: Rumor = {
    id: newId(),
    poiId: input.poiId ?? null,
    regionId: input.regionId ?? null,
    worldId: input.worldId,
    text: input.text,
    source: input.source ?? '',
    isUsed: false,
    isQuestHook: input.isQuestHook ?? false,
    hookId: null,
    links: input.links ?? [],
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.rumorRepo.create(rumor)
  return rumor
}
