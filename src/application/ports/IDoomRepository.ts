import type { Doom } from '@domain/entities/Doom'

export interface IDoomRepository {
  getById(id: string): Promise<Doom | undefined>
  getByRealmId(worldId: string): Promise<Doom[]>
  create(doom: Doom): Promise<void>
  update(doom: Doom): Promise<void>
  delete(id: string): Promise<void>
}
