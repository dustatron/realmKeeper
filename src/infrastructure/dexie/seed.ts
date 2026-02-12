import type { Transaction } from 'dexie'
import { cairnSystemConfig, shadowdarkSystemConfig } from './seed-system-configs'
import { cairnTableSets, cairnTableDefs } from './seed-tables-cairn'

export function seedDatabase(tx: Transaction) {
  tx.table('systemConfigs').bulkPut([cairnSystemConfig, shadowdarkSystemConfig])
  tx.table('tableSets').bulkPut(cairnTableSets)
  tx.table('tableDefs').bulkPut(cairnTableDefs)
}
