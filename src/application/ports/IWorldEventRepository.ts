import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { Season } from '@shared/constants'

export interface IWorldEventRepository {
  getById(id: string): Promise<WorldEvent | undefined>
  getByRealmId(realmId: string): Promise<WorldEvent[]>
  getByDate(realmId: string, year: number, season: Season, day: number): Promise<WorldEvent[]>
  getRecent(realmId: string, limit: number): Promise<WorldEvent[]>
  create(event: WorldEvent): Promise<void>
  delete(id: string): Promise<void>
}
