import { db } from '@infrastructure/dexie/db'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { Season } from '@shared/constants'

export class WorldEventRepository implements IWorldEventRepository {
  async getById(id: string): Promise<WorldEvent | undefined> {
    return db.worldEvents.get(id)
  }

  async getByRealmId(realmId: string): Promise<WorldEvent[]> {
    return db.worldEvents.where('realmId').equals(realmId).toArray()
  }

  async getByDate(
    realmId: string,
    year: number,
    season: Season,
    day: number
  ): Promise<WorldEvent[]> {
    return db.worldEvents
      .where('[year+season+day]')
      .equals([year, season, day])
      .filter((e) => e.realmId === realmId)
      .toArray()
  }

  async getRecent(realmId: string, limit: number): Promise<WorldEvent[]> {
    const all = await db.worldEvents
      .where('realmId')
      .equals(realmId)
      .toArray()
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  }

  async create(event: WorldEvent): Promise<void> {
    await db.worldEvents.put(event)
  }

  async delete(id: string): Promise<void> {
    await db.worldEvents.delete(id)
  }
}
