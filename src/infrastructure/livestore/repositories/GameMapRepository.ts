import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { gameMapCreated, gameMapUpdated, gameMapDeleted } from '../events'
import type { GameMap } from '@domain/entities/GameMap'

export class GameMapRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<GameMap | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM gameMaps WHERE id = $id', bindValues: { $id: id } }) as GameMap[]
    return rows[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<GameMap[]> {
    return this.store.query({
      query: 'SELECT * FROM gameMaps WHERE ownerRealmId = $worldId ORDER BY sortOrder ASC',
      bindValues: { $worldId: worldId },
    }) as GameMap[]
  }

  async getByPoiId(poiId: string): Promise<GameMap[]> {
    return this.store.query({
      query: 'SELECT * FROM gameMaps WHERE ownerPoiId = $poiId ORDER BY sortOrder ASC',
      bindValues: { $poiId: poiId },
    }) as GameMap[]
  }

  async create(gameMap: GameMap): Promise<void> {
    this.store.commit(gameMapCreated(gameMap as any))
  }

  async update(gameMap: GameMap): Promise<void> {
    this.store.commit(gameMapUpdated(gameMap as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(gameMapDeleted({ id }))
  }
}
