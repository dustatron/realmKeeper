import type { RollHistory } from '@domain/entities/RollHistory'

export interface IRollHistoryRepository {
  getByRealmId(worldId: string): Promise<RollHistory[]>
  getByTableId(tableId: string): Promise<RollHistory[]>
  getRecent(worldId: string, limit: number): Promise<RollHistory[]>
  create(roll: RollHistory): Promise<void>
  delete(id: string): Promise<void>
}
