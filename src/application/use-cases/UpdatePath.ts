import type { IPathRepository } from '@application/ports/IPathRepository'
import type { Path } from '@domain/entities/Path'

export async function executeUpdatePath(
  path: Path,
  deps: { pathRepo: IPathRepository }
): Promise<void> {
  await deps.pathRepo.update({ ...path, updatedAt: Date.now() })
}
