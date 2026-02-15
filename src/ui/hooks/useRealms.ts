import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRealms() {
  return useLiveQuery(() => db.worlds.toArray()) ?? []
}

export function useRealm(id: string | null) {
  return useLiveQuery(
    () => (id ? db.worlds.get(id) : undefined),
    [id]
  )
}
