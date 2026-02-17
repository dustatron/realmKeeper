import { db } from '@infrastructure/dexie/db'
import type { ICustomCompendiumRepository } from '@application/ports/ICustomCompendiumRepository'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'

export class CustomCompendiumRepository implements ICustomCompendiumRepository {
  async getById(id: string): Promise<CustomCompendiumEntry | undefined> {
    return db.customCompendiumEntries.get(id)
  }

  async getByWorldId(worldId: string): Promise<CustomCompendiumEntry[]> {
    return db.customCompendiumEntries.where('worldId').equals(worldId).toArray()
  }

  async getByWorldIdAndKind(worldId: string, kind: CustomCompendiumEntry['kind']): Promise<CustomCompendiumEntry[]> {
    return db.customCompendiumEntries
      .where('worldId')
      .equals(worldId)
      .filter((e) => e.kind === kind)
      .toArray()
  }

  async create(entry: CustomCompendiumEntry): Promise<void> {
    await db.customCompendiumEntries.put(entry)
  }

  async update(entry: CustomCompendiumEntry): Promise<void> {
    await db.customCompendiumEntries.put(entry)
  }

  async delete(id: string): Promise<void> {
    await db.customCompendiumEntries.delete(id)
  }
}
