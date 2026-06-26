import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'
import { newId } from '@shared/ulid'

export interface CreateGameMapInput {
  name: string
  ownerRealmId?: string | null
  ownerPoiId?: string | null
  imageUrl: string
  width: number
  height: number
  sortOrder?: number
}

export async function executeCreateGameMap(
  input: CreateGameMapInput,
  deps: { gameMapRepo: IGameMapRepository }
): Promise<GameMap> {
  const now = Date.now()
  const gameMap: GameMap = {
    id: newId(),
    name: input.name,
    ownerRealmId: input.ownerRealmId ?? null,
    ownerPoiId: input.ownerPoiId ?? null,
    imageUrl: input.imageUrl,
    kind: 'image',
    hexCols: null,
    hexRows: null,
    hexSize: null,
    hexOrientation: null,
    width: input.width,
    height: input.height,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  }
  await deps.gameMapRepo.create(gameMap)
  return gameMap
}
