import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useDoom(id: string | null) {
  return useLiveQuery(
    () => (id ? db.dooms.get(id) : undefined),
    [id],
  )
}

export function useRealmDoom(worldId: string | null) {
  return useLiveQuery(
    async () => {
      if (!worldId) return undefined
      const dooms = await db.dooms.where('worldId').equals(worldId).toArray()
      return dooms.find((d) => d.status === 'looming') ?? dooms[0] ?? undefined
    },
    [worldId],
  )
}
