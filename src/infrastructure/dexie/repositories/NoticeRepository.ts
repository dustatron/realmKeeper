import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { Notice } from '@domain/entities/Notice'
import { db } from '../db'

export class NoticeRepository implements INoticeRepository {
  async getById(id: string): Promise<Notice | undefined> {
    return db.notices.get(id)
  }

  async getByPoiId(poiId: string): Promise<Notice[]> {
    return db.notices.where('poiId').equals(poiId).toArray()
  }

  async getByRegionId(regionId: string): Promise<Notice[]> {
    return db.notices.where('regionId').equals(regionId).toArray()
  }

  async getByRealmId(worldId: string): Promise<Notice[]> {
    return db.notices.where('worldId').equals(worldId).toArray()
  }

  async create(notice: Notice): Promise<void> {
    await db.notices.put(notice)
  }

  async update(notice: Notice): Promise<void> {
    await db.notices.put(notice)
  }

  async delete(id: string): Promise<void> {
    await db.notices.delete(id)
  }
}
