import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { systemConfigsTable } from '@infrastructure/livestore/tables'
import type { SystemConfig } from '@domain/entities/SystemConfig'

export function useSystemConfigs() {
  return useQuery(queryDb(systemConfigsTable.select())) as SystemConfig[]
}

export function useSystemConfig(id: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM systemConfigs WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $id: id ?? '' },
  }, { deps: id })) as SystemConfig[]
  return results[0] as SystemConfig | undefined
}
