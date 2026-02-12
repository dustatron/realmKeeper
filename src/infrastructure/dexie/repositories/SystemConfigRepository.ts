import { db } from '@infrastructure/dexie/db'
import type { SystemConfig } from '@domain/entities/SystemConfig'

export class SystemConfigRepository {
  async getById(id: string): Promise<SystemConfig | undefined> {
    return db.systemConfigs.get(id)
  }

  async getAll(): Promise<SystemConfig[]> {
    return db.systemConfigs.toArray()
  }

  async getBySlug(slug: string): Promise<SystemConfig | undefined> {
    return db.systemConfigs.filter((sc) => sc.slug === slug).first()
  }

  async create(config: SystemConfig): Promise<void> {
    await db.systemConfigs.put(config)
  }

  async update(config: SystemConfig): Promise<void> {
    await db.systemConfigs.put(config)
  }
}
