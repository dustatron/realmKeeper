import type { Transaction } from 'dexie'
import { cairnSystemConfig, shadowdarkSystemConfig } from './seed-system-configs'

export function seedDatabase(tx: Transaction) {
  tx.table('systemConfigs').bulkPut([cairnSystemConfig, shadowdarkSystemConfig])
}
