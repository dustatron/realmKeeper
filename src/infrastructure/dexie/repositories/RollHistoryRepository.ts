import { db } from '@infrastructure/dexie/db'
import type { IRollHistoryRepository } from '@application/ports/IRollHistoryRepository'
import type { RollHistory } from '@domain/entities/RollHistory'

export class RollHistoryRepository implements IRollHistoryRepository {
  async getByRealmId(realmId: string): Promise<RollHistory[]> {
    return db.rollHistory.where('realmId').equals(realmId).toArray()
  }

  async getByTableId(tableId: string): Promise<RollHistory[]> {
    return db.rollHistory.where('tableId').equals(tableId).toArray()
  }

  async getRecent(realmId: string, limit: number): Promise<RollHistory[]> {
    const all = await db.rollHistory
      .where('realmId')
      .equals(realmId)
      .toArray()
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  }

  async create(roll: RollHistory): Promise<void> {
    await db.rollHistory.put(roll)
  }

  async delete(id: string): Promise<void> {
    await db.rollHistory.delete(id)
  }
}
