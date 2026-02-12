import type { IPathRepository } from '@application/ports/IPathRepository'

export async function executeDeletePath(
  pathId: string,
  deps: { pathRepo: IPathRepository }
): Promise<void> {
  await deps.pathRepo.delete(pathId)
}
