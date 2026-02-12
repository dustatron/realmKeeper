import type { RollHistory } from '@domain/entities/RollHistory'

export interface IRollHistoryRepository {
  getByRealmId(realmId: string): Promise<RollHistory[]>
  getByTableId(tableId: string): Promise<RollHistory[]>
  getRecent(realmId: string, limit: number): Promise<RollHistory[]>
  create(roll: RollHistory): Promise<void>
  delete(id: string): Promise<void>
}
