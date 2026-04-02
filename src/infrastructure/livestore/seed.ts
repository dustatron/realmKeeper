import type { Store } from '@livestore/livestore'
import { cairnSystemConfig, shadowdarkSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { systemConfigCreated } from './events'
import { systemConfigsTable } from './tables'
import type { schema } from './schema'

/**
 * Runs on LiveStore first boot. Seeds system configs if they don't exist.
 * Called via the `boot` prop on <LiveStoreProvider>.
 */
export async function bootStore(store: Store<typeof schema>) {
  const existing = store.query(systemConfigsTable.select())
  if (existing.length === 0) {
    store.commit(systemConfigCreated(cairnSystemConfig as any))
    store.commit(systemConfigCreated(shadowdarkSystemConfig as any))
  }
}
