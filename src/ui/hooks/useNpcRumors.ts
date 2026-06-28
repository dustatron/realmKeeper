import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { Rumor } from '@domain/entities/Rumor'

export function useNpcRumors(worldId: string | null, npcId: string | null): Rumor[] {
  return useLiveQuery(async () => {
    if (!worldId || !npcId) return []
    return (await db.rumors.where('worldId').equals(worldId).toArray()).filter(
      (r) => r.sourceNpcId === npcId
    )
  }, [worldId, npcId]) ?? []
}
