import type { Store } from '@livestore/livestore'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { schema } from '@infrastructure/livestore/schema'
import {
  systemConfigCreated,
  systemConfigUpdated,
} from '@infrastructure/livestore/events'

export class SystemConfigRepository {
  constructor(private store: Store<typeof schema>) {}

  async getAll(): Promise<SystemConfig[]> {
    return this.store.query({ query: 'SELECT * FROM systemConfigs', bindValues: {} }) as SystemConfig[]
  }

  async getById(id: string): Promise<SystemConfig | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM systemConfigs WHERE id = $id', bindValues: { $id: id } },
    ) as SystemConfig[]
    return results[0] ?? undefined
  }

  async getBySlug(slug: string): Promise<SystemConfig | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM systemConfigs WHERE slug = $slug', bindValues: { $slug: slug } },
    ) as SystemConfig[]
    return results[0] ?? undefined
  }

  async create(config: SystemConfig): Promise<void> {
    this.store.commit(systemConfigCreated(config as any))
  }

  async update(config: SystemConfig): Promise<void> {
    this.store.commit(systemConfigUpdated(config as any))
  }
}
