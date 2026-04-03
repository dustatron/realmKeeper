import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { worldsTable } from '@infrastructure/livestore/tables'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { Realm } from '@domain/entities/Realm'

export function useRealms() {
  return useQuery(queryDb(worldsTable.select())) as Realm[]
}

export function useRealm(id: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM worlds WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: id ?? '' },
  }, { deps: [id], map: parseJsonRows })) as Realm[]
  return results[0] as Realm | undefined
}
