import type { Store } from '@livestore/livestore'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Region } from '@domain/entities/Region'
import type { schema } from '@infrastructure/livestore/schema'
import {
  regionCreated,
  regionUpdated,
  regionDeleted,
} from '@infrastructure/livestore/events'
import { regionsTable } from '../tables'

export class RegionRepository implements IRegionRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<Region | undefined> {
    const results = this.store.query(
      regionsTable.select().where({ id }),
    ) as Region[]
    return results[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<Region[]> {
    return this.store.query(
      regionsTable.select().where({ worldId }),
    ) as Region[]
  }

  async create(region: Region): Promise<void> {
    this.store.commit(regionCreated(region as any))
  }

  async update(region: Region): Promise<void> {
    this.store.commit(regionUpdated(region as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(regionDeleted({ id }))
  }
}
