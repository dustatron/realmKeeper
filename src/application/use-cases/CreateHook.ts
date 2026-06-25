import type { IHookRepository } from '@application/ports/IHookRepository'
import type { Hook, HookType, HookSecret } from '@domain/entities/Hook'
import { newId } from '@shared/ulid'

export interface CreateHookInput {
  worldId: string
  type: HookType
  title: string
  secret: HookSecret
  contactNpcId?: string | null
  rewardText?: string
}

export async function executeCreateHook(
  input: CreateHookInput,
  deps: { hookRepo: IHookRepository }
): Promise<Hook> {
  const now = Date.now()
  const hook: Hook = {
    id: newId(),
    worldId: input.worldId,
    type: input.type,
    title: input.title,
    status: 'open',
    contactNpcId: input.contactNpcId ?? null,
    rewardText: input.rewardText ?? '',
    secret: input.secret,
    createdAt: now,
    updatedAt: now,
  }
  await deps.hookRepo.create(hook)
  return hook
}
