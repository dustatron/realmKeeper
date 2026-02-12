import { db } from '@infrastructure/dexie/db'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { Path } from '@domain/entities/Path'

export class PathRepository implements IPathRepository {
  async getById(id: string): Promise<Path | undefined> {
    return db.paths.get(id)
  }

  async getByRegionId(regionId: string): Promise<Path[]> {
    return db.paths.where('regionId').equals(regionId).toArray()
  }

  async getByPoi(poiId: string): Promise<Path[]> {
    const [fromPaths, toPaths] = await Promise.all([
      db.paths.where('fromPoiId').equals(poiId).toArray(),
      db.paths.where('toPoiId').equals(poiId).toArray(),
    ])
    // Dedupe in case compound index includes both
    const seen = new Set<string>()
    const result: Path[] = []
    for (const p of [...fromPaths, ...toPaths]) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        result.push(p)
      }
    }
    return result
  }

  async create(path: Path): Promise<void> {
    await db.paths.put(path)
  }

  async update(path: Path): Promise<void> {
    await db.paths.put(path)
  }

  async delete(id: string): Promise<void> {
    await db.paths.delete(id)
  }
}
