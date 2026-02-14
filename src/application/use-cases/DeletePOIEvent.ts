import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'

export async function executeDeletePOIEvent(
  eventId: string,
  deps: { poiEventRepo: IPOIEventRepository }
): Promise<void> {
  await deps.poiEventRepo.delete(eventId)
}
