import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { pathCreated, pathUpdated, pathDeleted } from '../events'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { Path } from '@domain/entities/Path'

export class PathRepository implements IPathRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<Path | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM paths WHERE id = $id', bindValues: { $id: id } }) as Path[]
    return rows[0] ?? undefined
  }

  async getByPoi(poiId: string): Promise<Path[]> {
    const rows = this.store.query(
      {
        query: 'SELECT * FROM paths WHERE fromPoiId = $poiId OR toPoiId = $poiId',
        bindValues: { $poiId: poiId },
      },
    ) as Path[]

    // Dedupe in case a path appears in both sides of the OR
    const seen = new Set<string>()
    const result: Path[] = []
    for (const p of rows) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        result.push(p)
      }
    }
    return result
  }

  async create(path: Path): Promise<void> {
    this.store.commit(pathCreated(path as any))
  }

  async update(path: Path): Promise<void> {
    this.store.commit(pathUpdated(path as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(pathDeleted({ id }))
  }
}
