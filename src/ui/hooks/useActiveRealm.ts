import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useUIStore } from '~/ui/stores/uiStore'
import type { Realm } from '@domain/entities/Realm'

export function useActiveRealm() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const results = useQuery(queryDb({
    query: 'SELECT * FROM worlds WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: activeRealmId ?? '' },
  }, { deps: [activeRealmId] })) as Realm[]
  return (activeRealmId ? results[0] : undefined) as Realm | undefined
}
