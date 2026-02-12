import type { Realm } from '@domain/entities/Realm'

export interface IRealmRepository {
  getById(id: string): Promise<Realm | undefined>
  getAll(): Promise<Realm[]>
  create(realm: Realm): Promise<void>
  update(realm: Realm): Promise<void>
  delete(id: string): Promise<void>
}
