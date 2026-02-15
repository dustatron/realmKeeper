import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { Notice } from '@domain/entities/Notice'

export async function executeUpdateNotice(
  notice: Notice,
  deps: { noticeRepo: INoticeRepository }
): Promise<void> {
  await deps.noticeRepo.update({ ...notice, updatedAt: Date.now() })
}
