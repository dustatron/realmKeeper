import type { IRumorRepository } from '@application/ports/IRumorRepository'

export async function executeDeleteRumor(
  id: string,
  deps: { rumorRepo: IRumorRepository }
): Promise<void> {
  await deps.rumorRepo.delete(id)
}
