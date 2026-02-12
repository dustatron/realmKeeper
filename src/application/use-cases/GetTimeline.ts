import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { WorldEvent } from '@domain/entities/WorldEvent'

export async function executeGetTimeline(
  realmId: string,
  limit: number,
  deps: { worldEventRepo: IWorldEventRepository }
): Promise<WorldEvent[]> {
  return deps.worldEventRepo.getRecent(realmId, limit)
}
