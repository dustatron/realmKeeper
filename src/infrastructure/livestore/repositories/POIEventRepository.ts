import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { poiEventCreated, poiEventUpdated, poiEventDeleted } from '../events'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { POIEvent } from '@domain/entities/POIEvent'

export class POIEventRepository implements IPOIEventRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<POIEvent | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM poiEvents WHERE id = $id', bindValues: { $id: id } }) as POIEvent[]
    return rows[0] ?? undefined
  }

  async getByPoiId(poiId: string): Promise<POIEvent[]> {
    return this.store.query({ query: 'SELECT * FROM poiEvents WHERE poiId = $poiId', bindValues: { $poiId: poiId } }) as POIEvent[]
  }

  async getByRealmId(worldId: string): Promise<POIEvent[]> {
    return this.store.query({ query: 'SELECT * FROM poiEvents WHERE worldId = $worldId', bindValues: { $worldId: worldId } }) as POIEvent[]
  }

  async getActive(worldId: string): Promise<POIEvent[]> {
    return this.store.query(
      { query: 'SELECT * FROM poiEvents WHERE worldId = $worldId AND isActive = 1', bindValues: { $worldId: worldId } },
    ) as POIEvent[]
  }

  async create(event: POIEvent): Promise<void> {
    this.store.commit(poiEventCreated(event as any))
  }

  async update(event: POIEvent): Promise<void> {
    this.store.commit(poiEventUpdated(event as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(poiEventDeleted({ id }))
  }
}
