import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type { Connection } from '@domain/entities/Connection'
import { db } from '../db'

export class ConnectionRepository implements IConnectionRepository {
  async getByEntity(worldId: string, entityId: string): Promise<Connection[]> {
    const [from, to] = await Promise.all([
      db.connections.where('[worldId+fromId]').equals([worldId, entityId]).toArray(),
      db.connections.where('[worldId+toId]').equals([worldId, entityId]).toArray(),
    ])
    const byId = new Map<string, Connection>()
    for (const c of [...from, ...to]) byId.set(c.id, c)
    return [...byId.values()]
  }

  async getByWorld(worldId: string): Promise<Connection[]> {
    return db.connections.where('worldId').equals(worldId).toArray()
  }

  async getByHook(hookId: string): Promise<Connection[]> {
    return db.connections.where('hookId').equals(hookId).toArray()
  }

  async create(connection: Connection): Promise<void> {
    await db.connections.put(connection)
  }

  async bulkCreate(connections: Connection[]): Promise<void> {
    await db.connections.bulkPut(connections)
  }

  async update(connection: Connection): Promise<void> {
    await db.connections.put(connection)
  }

  async delete(id: string): Promise<void> {
    await db.connections.delete(id)
  }
}
