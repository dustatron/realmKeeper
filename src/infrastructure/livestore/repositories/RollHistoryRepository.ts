import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { rollHistoryCreated } from '../events'
import type { RollHistory } from '@domain/entities/RollHistory'

export class RollHistoryRepository {
  constructor(private store: Store<typeof schema>) {}

  async getByRealmId(worldId: string): Promise<RollHistory[]> {
    return this.store.query(
      { query: 'SELECT * FROM rollHistory WHERE worldId = $worldId', bindValues: { $worldId: worldId } }
    ) as RollHistory[]
  }

  async getByTableId(tableId: string): Promise<RollHistory[]> {
    return this.store.query(
      { query: 'SELECT * FROM rollHistory WHERE tableId = $tableId', bindValues: { $tableId: tableId } }
    ) as RollHistory[]
  }

  async getRecent(worldId: string, limit: number): Promise<RollHistory[]> {
    return this.store.query(
      { query: `SELECT * FROM rollHistory WHERE worldId = $worldId ORDER BY timestamp DESC LIMIT ${limit}`, bindValues: { $worldId: worldId } }
    ) as RollHistory[]
  }

  async create(roll: RollHistory): Promise<void> {
    this.store.commit(rollHistoryCreated(roll as any))
  }

  async delete(id: string): Promise<void> {
    // RollHistory has no deleted event — remove via direct table mutation is not supported.
    // This method is intentionally left as a no-op; callers should not delete roll history entries.
    void id
  }
}
