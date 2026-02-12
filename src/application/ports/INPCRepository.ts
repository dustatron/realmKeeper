import type { NPC } from '@domain/entities/NPC'

export interface INPCRepository {
  getById(id: string): Promise<NPC | undefined>
  getByRealmId(realmId: string): Promise<NPC[]>
  getByFactionId(factionId: string): Promise<NPC[]>
  getByRegionId(regionId: string): Promise<NPC[]>
  getByTag(realmId: string, tag: string): Promise<NPC[]>
  create(npc: NPC): Promise<void>
  update(npc: NPC): Promise<void>
  delete(id: string): Promise<void>
}
