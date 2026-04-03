import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useUIStore } from '~/ui/stores/uiStore'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { Realm } from '@domain/entities/Realm'

export function useActiveRealm() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const results = useQuery(queryDb({
    query: 'SELECT * FROM worlds WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: activeRealmId ?? '' },
  }, { deps: [activeRealmId], map: parseJsonRows })) as Realm[]
  return (activeRealmId ? results[0] : undefined) as Realm | undefined
}
