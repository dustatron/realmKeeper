import type { Store } from '@livestore/livestore'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { Realm } from '@domain/entities/Realm'
import type { schema } from '@infrastructure/livestore/schema'
import {
  worldCreated,
  worldUpdated,
  worldDeleted,
} from '@infrastructure/livestore/events'

export class RealmRepository implements IRealmRepository {
  constructor(private store: Store<typeof schema>) {}

  async getAll(): Promise<Realm[]> {
    return this.store.query({ query: 'SELECT * FROM worlds', bindValues: {} }) as Realm[]
  }

  async getById(id: string): Promise<Realm | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM worlds WHERE id = $id', bindValues: { $id: id } },
    ) as Realm[]
    return results[0] ?? undefined
  }

  async create(realm: Realm): Promise<void> {
    this.store.commit(worldCreated(realm as any))
  }

  async update(realm: Realm): Promise<void> {
    this.store.commit(worldUpdated(realm as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(worldDeleted({ id }))
  }
}
