import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

// Returns `undefined` while the query is loading, `null` when the doom does not
// exist (so callers can tell "loading" apart from "not found"), else the Doom.
export function useDoom(id: string | null) {
  return useLiveQuery(
    () => (id ? db.dooms.get(id).then((d) => d ?? null) : null),
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
