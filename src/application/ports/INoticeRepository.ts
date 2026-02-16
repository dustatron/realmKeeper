import type { Notice } from '@domain/entities/Notice'

export interface INoticeRepository {
  getById(id: string): Promise<Notice | undefined>
  getByPoiId(poiId: string): Promise<Notice[]>
  getByRegionId(regionId: string): Promise<Notice[]>
  getByRealmId(worldId: string): Promise<Notice[]>
  create(notice: Notice): Promise<void>
  update(notice: Notice): Promise<void>
  delete(id: string): Promise<void>
}
