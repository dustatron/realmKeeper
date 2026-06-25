import type { Hook } from '@domain/entities/Hook'

export interface IHookRepository {
  getById(id: string): Promise<Hook | undefined>
  getByWorld(worldId: string): Promise<Hook[]>
  create(hook: Hook): Promise<void>
  bulkCreate(hooks: Hook[]): Promise<void>
  update(hook: Hook): Promise<void>
  delete(id: string): Promise<void>
}
