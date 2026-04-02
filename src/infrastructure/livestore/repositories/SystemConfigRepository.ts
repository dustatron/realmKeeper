import type { Store } from '@livestore/livestore'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { schema } from '@infrastructure/livestore/schema'
import {
  systemConfigCreated,
  systemConfigUpdated,
} from '@infrastructure/livestore/events'
import { systemConfigsTable } from '../tables'

export class SystemConfigRepository {
  constructor(private store: Store<typeof schema>) {}

  async getAll(): Promise<SystemConfig[]> {
    return this.store.query(systemConfigsTable.select()) as SystemConfig[]
  }

  async getById(id: string): Promise<SystemConfig | undefined> {
    const results = this.store.query(
      systemConfigsTable.select().where({ id }),
    ) as SystemConfig[]
    return results[0] ?? undefined
  }

  async getBySlug(slug: string): Promise<SystemConfig | undefined> {
    const results = this.store.query(
      systemConfigsTable.select().where({ slug }),
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
