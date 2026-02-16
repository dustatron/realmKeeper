import type { Faction } from '@domain/entities/Faction'

export interface IFactionRepository {
  getById(id: string): Promise<Faction | undefined>
  getByRealmId(worldId: string): Promise<Faction[]>
  getPartyFaction(worldId: string): Promise<Faction | undefined>
  getActive(worldId: string): Promise<Faction[]>
  create(faction: Faction): Promise<void>
  update(faction: Faction): Promise<void>
  delete(id: string): Promise<void>
}
