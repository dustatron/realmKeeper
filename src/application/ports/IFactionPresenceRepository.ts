import type { FactionPresence } from '@domain/entities/FactionPresence'

export interface IFactionPresenceRepository {
  getById(id: string): Promise<FactionPresence | undefined>
  getByFactionId(factionId: string): Promise<FactionPresence[]>
  getByPoiId(poiId: string): Promise<FactionPresence[]>
  create(presence: FactionPresence): Promise<void>
  update(presence: FactionPresence): Promise<void>
  delete(id: string): Promise<void>
}
