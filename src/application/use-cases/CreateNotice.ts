import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { Notice } from '@domain/entities/Notice'
import type { NoticeType } from '@shared/constants'
import { newId } from '@shared/ulid'

export interface CreateNoticeInput {
  poiId?: string | null
  regionId?: string | null
  realmId: string
  title: string
  description?: string
  type: NoticeType
  reward?: string
  contactNpcId?: string | null
  tags?: string[]
}

export async function executeCreateNotice(
  input: CreateNoticeInput,
  deps: { noticeRepo: INoticeRepository }
): Promise<Notice> {
  const now = Date.now()
  const notice: Notice = {
    id: newId(),
    poiId: input.poiId ?? null,
    regionId: input.regionId ?? null,
    realmId: input.realmId,
    title: input.title,
    description: input.description ?? '',
    type: input.type,
    reward: input.reward ?? '',
    contactNpcId: input.contactNpcId ?? null,
    isUsed: false,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await deps.noticeRepo.create(notice)
  return notice
}
