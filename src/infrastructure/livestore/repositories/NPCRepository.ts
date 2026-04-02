import type { Store } from '@livestore/livestore'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { NPC } from '@domain/entities/NPC'
import type { schema } from '@infrastructure/livestore/schema'
import {
  npcCreated,
  npcUpdated,
  npcDeleted,
} from '@infrastructure/livestore/events'

export class NPCRepository implements INPCRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<NPC | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM npcs WHERE id = $id', bindValues: { id } },
    ) as NPC[]
    return results[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<NPC[]> {
    return this.store.query(
      { query: 'SELECT * FROM npcs WHERE worldId = $worldId', bindValues: { worldId } },
    ) as NPC[]
  }

  async getByFactionId(factionId: string): Promise<NPC[]> {
    return this.store.query(
      {
        query: 'SELECT * FROM npcs WHERE EXISTS (SELECT 1 FROM json_each(factionIds) WHERE value = $factionId)',
        bindValues: { factionId },
      },
    ) as NPC[]
  }

  async getByRegionId(regionId: string): Promise<NPC[]> {
    return this.store.query(
      { query: 'SELECT * FROM npcs WHERE regionId = $regionId', bindValues: { regionId } },
    ) as NPC[]
  }

  async getByPoiId(poiId: string): Promise<NPC[]> {
    return this.store.query(
      { query: 'SELECT * FROM npcs WHERE poiId = $poiId', bindValues: { poiId } },
    ) as NPC[]
  }

  async getByTag(worldId: string, tag: string): Promise<NPC[]> {
    return this.store.query(
      {
        query: 'SELECT * FROM npcs WHERE worldId = $worldId AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value = $tag)',
        bindValues: { worldId, tag },
      },
    ) as NPC[]
  }

  async create(npc: NPC): Promise<void> {
    this.store.commit(npcCreated(npc as any))
  }

  async update(npc: NPC): Promise<void> {
    this.store.commit(npcUpdated(npc as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(npcDeleted({ id }))
  }
}
