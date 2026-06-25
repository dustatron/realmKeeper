import type { Connection } from '@domain/entities/Connection'

export interface IConnectionRepository {
  getByEntity(worldId: string, entityId: string): Promise<Connection[]>
  getByHook(hookId: string): Promise<Connection[]>
  create(connection: Connection): Promise<void>
  bulkCreate(connections: Connection[]): Promise<void>
  update(connection: Connection): Promise<void>
  delete(id: string): Promise<void>
}
