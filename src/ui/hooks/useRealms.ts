import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRealms() {
  return useLiveQuery(() => db.realms.toArray()) ?? []
}

export function useRealm(id: string | null) {
  return useLiveQuery(
    () => (id ? db.realms.get(id) : undefined),
    [id]
  )
}
