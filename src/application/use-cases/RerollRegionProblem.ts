import type { IRegionRepository } from '@application/ports/IRegionRepository'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { newId } from '@shared/ulid'
import { REGION_PROBLEMS } from '@domain/services/worldgen/regionFlavor'

export async function executeRerollRegionProblem(
  regionId: string,
  deps: { regionRepo: IRegionRepository },
): Promise<string> {
  const region = await deps.regionRepo.getById(regionId)
  if (!region) throw new Error('Region not found')
  // Fresh seed each call → variety over reproducibility (GM convenience).
  const rng = new SeededRandom(newId())
  let problem = rng.pick(REGION_PROBLEMS)
  if (problem === region.problem && REGION_PROBLEMS.length > 1) {
    problem = rng.pick(REGION_PROBLEMS.filter((p) => p !== region.problem))
  }
  await deps.regionRepo.update({ ...region, problem, updatedAt: Date.now() })
  return problem
}
