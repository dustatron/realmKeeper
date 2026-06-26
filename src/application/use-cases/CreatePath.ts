import type { IPathRepository } from '@application/ports/IPathRepository'
import type { Path } from '@domain/entities/Path'
import { buildPath, type BuildPathInput } from '@domain/services/worldgen/buildPath'

export type CreatePathInput = BuildPathInput

export async function executeCreatePath(
  input: CreatePathInput,
  deps: { pathRepo: IPathRepository }
): Promise<Path> {
  const path = buildPath(input)
  await deps.pathRepo.create(path)
  return path
}
