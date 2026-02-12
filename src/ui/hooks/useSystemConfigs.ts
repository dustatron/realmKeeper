import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useSystemConfigs() {
  return useLiveQuery(() => db.systemConfigs.toArray()) ?? []
}

export function useSystemConfig(id: string | null) {
  return useLiveQuery(
    () => (id ? db.systemConfigs.get(id) : undefined),
    [id]
  )
}
