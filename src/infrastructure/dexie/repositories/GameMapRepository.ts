import { db } from '@infrastructure/dexie/db'
import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'

export class GameMapRepository implements IGameMapRepository {
  async getById(id: string): Promise<GameMap | undefined> {
    return db.gameMaps.get(id)
  }

  async getByRealmId(realmId: string): Promise<GameMap[]> {
    return db.gameMaps.where('ownerRealmId').equals(realmId).sortBy('sortOrder')
  }

  async getByPoiId(poiId: string): Promise<GameMap[]> {
    return db.gameMaps.where('ownerPoiId').equals(poiId).sortBy('sortOrder')
  }

  async create(gameMap: GameMap): Promise<void> {
    await db.gameMaps.put(gameMap)
  }

  async update(gameMap: GameMap): Promise<void> {
    await db.gameMaps.put(gameMap)
  }

  async delete(id: string): Promise<void> {
    await db.gameMaps.delete(id)
  }
}
