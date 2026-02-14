import type { GameMap } from '@domain/entities/GameMap'

export interface IGameMapRepository {
  getById(id: string): Promise<GameMap | undefined>
  getByRealmId(realmId: string): Promise<GameMap[]>
  getByPoiId(poiId: string): Promise<GameMap[]>
  create(gameMap: GameMap): Promise<void>
  update(gameMap: GameMap): Promise<void>
  delete(id: string): Promise<void>
}
