import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { noticeCreated, noticeUpdated, noticeDeleted } from '../events'
import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { Notice } from '@domain/entities/Notice'

export class NoticeRepository implements INoticeRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<Notice | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM notices WHERE id = $id', bindValues: { $id: id } }) as Notice[]
    return rows[0] ?? undefined
  }

  async getByPoiId(poiId: string): Promise<Notice[]> {
    return this.store.query({ query: 'SELECT * FROM notices WHERE poiId = $poiId', bindValues: { $poiId: poiId } }) as Notice[]
  }

  async getByRegionId(regionId: string): Promise<Notice[]> {
    return this.store.query({ query: 'SELECT * FROM notices WHERE regionId = $regionId', bindValues: { $regionId: regionId } }) as Notice[]
  }

  async getByRealmId(worldId: string): Promise<Notice[]> {
    return this.store.query({ query: 'SELECT * FROM notices WHERE worldId = $worldId', bindValues: { $worldId: worldId } }) as Notice[]
  }

  async create(notice: Notice): Promise<void> {
    this.store.commit(noticeCreated(notice as any))
  }

  async update(notice: Notice): Promise<void> {
    this.store.commit(noticeUpdated(notice as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(noticeDeleted({ id }))
  }
}
