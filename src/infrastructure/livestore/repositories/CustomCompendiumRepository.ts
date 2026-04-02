import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import {
  customCompendiumEntryCreated,
  customCompendiumEntryUpdated,
  customCompendiumEntryDeleted,
} from '../events'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'

export class CustomCompendiumRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<CustomCompendiumEntry | undefined> {
    const rows = this.store.query(
      { query: 'SELECT * FROM customCompendiumEntries WHERE id = $id', bindValues: { id } }
    ) as CustomCompendiumEntry[]
    return rows[0] ?? undefined
  }

  async getByWorldId(worldId: string): Promise<CustomCompendiumEntry[]> {
    return this.store.query(
      { query: 'SELECT * FROM customCompendiumEntries WHERE worldId = $worldId', bindValues: { worldId } }
    ) as CustomCompendiumEntry[]
  }

  async getByWorldIdAndKind(
    worldId: string,
    kind: CustomCompendiumEntry['kind']
  ): Promise<CustomCompendiumEntry[]> {
    return this.store.query(
      { query: 'SELECT * FROM customCompendiumEntries WHERE worldId = $worldId AND kind = $kind', bindValues: { worldId, kind } }
    ) as CustomCompendiumEntry[]
  }

  async create(entry: CustomCompendiumEntry): Promise<void> {
    this.store.commit(customCompendiumEntryCreated(entry as any))
  }

  async update(entry: CustomCompendiumEntry): Promise<void> {
    this.store.commit(customCompendiumEntryUpdated(entry as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(customCompendiumEntryDeleted({ id }))
  }
}
