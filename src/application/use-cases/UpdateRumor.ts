import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { Rumor } from '@domain/entities/Rumor'

export async function executeUpdateRumor(
  rumor: Rumor,
  deps: { rumorRepo: IRumorRepository }
): Promise<void> {
  await deps.rumorRepo.update({ ...rumor, updatedAt: Date.now() })
}
