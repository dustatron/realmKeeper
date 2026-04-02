import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { worldEventCreated, worldEventDeleted } from '../events'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { Season } from '@shared/constants'

export class WorldEventRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<WorldEvent | undefined> {
    const rows = this.store.query(
      { query: 'SELECT * FROM worldEvents WHERE id = $id', bindValues: { id } }
    ) as WorldEvent[]
    return rows[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<WorldEvent[]> {
    return this.store.query(
      { query: 'SELECT * FROM worldEvents WHERE worldId = $worldId', bindValues: { worldId } }
    ) as WorldEvent[]
  }

  async getByDate(
    worldId: string,
    year: number,
    season: Season,
    day: number
  ): Promise<WorldEvent[]> {
    return this.store.query(
      { query: 'SELECT * FROM worldEvents WHERE worldId = $worldId AND year = $year AND season = $season AND day = $day', bindValues: { worldId, year, season, day } }
    ) as WorldEvent[]
  }

  async getRecent(worldId: string, limit: number): Promise<WorldEvent[]> {
    return this.store.query(
      { query: `SELECT * FROM worldEvents WHERE worldId = $worldId ORDER BY createdAt DESC LIMIT ${limit}`, bindValues: { worldId } }
    ) as WorldEvent[]
  }

  async create(event: WorldEvent): Promise<void> {
    this.store.commit(worldEventCreated(event as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(worldEventDeleted({ id }))
  }
}
