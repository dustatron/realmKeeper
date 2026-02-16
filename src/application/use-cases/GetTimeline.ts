import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { WorldEvent } from '@domain/entities/WorldEvent'

export async function executeGetTimeline(
  worldId: string,
  limit: number,
  deps: { worldEventRepo: IWorldEventRepository }
): Promise<WorldEvent[]> {
  return deps.worldEventRepo.getRecent(worldId, limit)
}
