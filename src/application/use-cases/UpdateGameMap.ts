import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'

export async function executeUpdateGameMap(
  gameMap: GameMap,
  deps: { gameMapRepo: IGameMapRepository }
): Promise<void> {
  await deps.gameMapRepo.update({ ...gameMap, updatedAt: Date.now() })
}
