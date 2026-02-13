import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { POIEvent } from '@domain/entities/POIEvent'

export async function executeUpdatePOIEvent(
  event: POIEvent,
  deps: { poiEventRepo: IPOIEventRepository }
): Promise<void> {
  await deps.poiEventRepo.update({ ...event, updatedAt: Date.now() })
}
