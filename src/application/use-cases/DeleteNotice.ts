import type { INoticeRepository } from '@application/ports/INoticeRepository'

export async function executeDeleteNotice(
  id: string,
  deps: { noticeRepo: INoticeRepository }
): Promise<void> {
  await deps.noticeRepo.delete(id)
}
