import type { Faction } from '@domain/entities/Faction'

export interface IFactionRepository {
  getById(id: string): Promise<Faction | undefined>
  getByRealmId(realmId: string): Promise<Faction[]>
  getPartyFaction(realmId: string): Promise<Faction | undefined>
  getActive(realmId: string): Promise<Faction[]>
  create(faction: Faction): Promise<void>
  update(faction: Faction): Promise<void>
  delete(id: string): Promise<void>
}
