import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { POIEventType, Season } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface CreatePOIEventInput {
  poiId: string
  realmId: string
  name: string
  description?: string
  type: POIEventType
  trigger: {
    year: number | null
    season: Season
    day: number
    watch: number | null
  }
  recurring: boolean
  durationWatches: number
  effects?: string
  tags?: string[]
}

export async function executeCreatePOIEvent(
  input: CreatePOIEventInput,
  deps: { poiEventRepo: IPOIEventRepository }
): Promise<POIEvent> {
  const now = Date.now()
  const event: POIEvent = {
    id: newId(),
    poiId: input.poiId,
    realmId: input.realmId,
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    trigger: input.trigger,
    recurring: input.recurring,
    durationWatches: input.durationWatches,
    isActive: false,
    effects: input.effects ?? '',
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.poiEventRepo.create(event)
  return event
}
