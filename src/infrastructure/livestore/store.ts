import { useStore, useQuery } from '@livestore/react'
import { makePersistedAdapter } from '@livestore/adapter-web'
import { schema } from './schema'
import { events } from './events'
import LiveStoreWorker from './livestore.worker?worker'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'

// Export typed React hooks for use across the app
export { useStore, useQuery }

// The adapter — persists to OPFS via web worker + shared worker
export const adapter = makePersistedAdapter({
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
  storage: { type: 'opfs' },
})

// ElectricSQL sync will be added in Phase 5 when Coolify infra is ready
// sync: makeElectricSync({ url: import.meta.env.VITE_ELECTRIC_URL })

export { events, schema }
