import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { rumorCreated, rumorUpdated, rumorDeleted } from '../events'
import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { Rumor } from '@domain/entities/Rumor'

export class RumorRepository implements IRumorRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<Rumor | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM rumors WHERE id = $id', bindValues: { $id: id } }) as Rumor[]
    return rows[0] ?? undefined
  }

  async getByPoiId(poiId: string): Promise<Rumor[]> {
    return this.store.query({ query: 'SELECT * FROM rumors WHERE poiId = $poiId', bindValues: { $poiId: poiId } }) as Rumor[]
  }

  async getByRegionId(regionId: string): Promise<Rumor[]> {
    return this.store.query({ query: 'SELECT * FROM rumors WHERE regionId = $regionId', bindValues: { $regionId: regionId } }) as Rumor[]
  }

  async getByRealmId(worldId: string): Promise<Rumor[]> {
    return this.store.query({ query: 'SELECT * FROM rumors WHERE worldId = $worldId', bindValues: { $worldId: worldId } }) as Rumor[]
  }

  async create(rumor: Rumor): Promise<void> {
    this.store.commit(rumorCreated(rumor as any))
  }

  async update(rumor: Rumor): Promise<void> {
    this.store.commit(rumorUpdated(rumor as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(rumorDeleted({ id }))
  }
}
