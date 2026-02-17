import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'

export interface ICustomCompendiumRepository {
  getById(id: string): Promise<CustomCompendiumEntry | undefined>
  getByWorldId(worldId: string): Promise<CustomCompendiumEntry[]>
  getByWorldIdAndKind(worldId: string, kind: CustomCompendiumEntry['kind']): Promise<CustomCompendiumEntry[]>
  create(entry: CustomCompendiumEntry): Promise<void>
  update(entry: CustomCompendiumEntry): Promise<void>
  delete(id: string): Promise<void>
}
