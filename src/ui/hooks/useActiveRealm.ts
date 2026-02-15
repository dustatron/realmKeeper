import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { useUIStore } from '~/ui/stores/uiStore'

export function useActiveRealm() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useLiveQuery(
    () => (activeRealmId ? db.worlds.get(activeRealmId) : undefined),
    [activeRealmId]
  )
  return realm
}
