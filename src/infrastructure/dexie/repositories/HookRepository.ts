import type { IHookRepository } from '@application/ports/IHookRepository'
import type { Hook } from '@domain/entities/Hook'
import { db } from '../db'

export class HookRepository implements IHookRepository {
  async getById(id: string): Promise<Hook | undefined> {
    return db.hooks.get(id)
  }

  async getByWorld(worldId: string): Promise<Hook[]> {
    return db.hooks.where('worldId').equals(worldId).toArray()
  }

  async create(hook: Hook): Promise<void> {
    await db.hooks.put(hook)
  }

  async bulkCreate(hooks: Hook[]): Promise<void> {
    await db.hooks.bulkPut(hooks)
  }

  async update(hook: Hook): Promise<void> {
    await db.hooks.put(hook)
  }

  async delete(id: string): Promise<void> {
    await db.hooks.delete(id)
  }
}
