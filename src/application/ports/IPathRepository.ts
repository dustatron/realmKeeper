import type { Path } from '@domain/entities/Path'

export interface IPathRepository {
  getById(id: string): Promise<Path | undefined>
  getByRegionId(regionId: string): Promise<Path[]>
  getByPoi(poiId: string): Promise<Path[]>
  create(path: Path): Promise<void>
  update(path: Path): Promise<void>
  delete(id: string): Promise<void>
}
