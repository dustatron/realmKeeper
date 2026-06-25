# World Generation — Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the data + math foundation for procedural world generation — a test harness, the `Connection` and `Hook` entities with their Dexie tables and repositories, the `hookId`/`kind` field additions and migration, the pure hex-grid math library, and the worldgen content-table scaffolding.

**Architecture:** Follows the existing clean/hexagonal layering (domain entities → application ports/use-cases → infrastructure Dexie repos → container). New narrative graph edges live in one polymorphic `Connection` table (mirrors the existing `EntityNote` `ownerType`/`ownerId` precedent); quests live in a `Hook` aggregate. All schema changes ship in a single Dexie `version(36)` migration with backfill. Hex math and worldgen tables are pure, deterministic, and unit-tested.

**Tech Stack:** TypeScript (strict), Dexie 4 (IndexedDB), Vitest + fake-indexeddb (new test harness), ULID ids, existing `SeededRandom` (mulberry32) for deterministic picks.

## Spec & phase roadmap

This plan implements **Phase 1 of 5** from `docs/superpowers/specs/2026-06-24-procedural-world-generation-design.md`. The remaining phases get their own plans once Phase 1 lands:

- **Phase 1 (this plan):** Foundation — entities, migration, repos, hex math, worldgen scaffolding.
- **Phase 2:** Hex map render — hex-polygon GeoJSON layer in `MapViewer`, `kind`-based source selection.
- **Phase 3:** Core generation pipeline — stages 1–7 (realm → hex grid → regions → POIs → paths → factions → rels → NPCs), pure + `GenerateWorldUseCase` with bulk-write transaction.
- **Phase 4:** The web — Connection edges, Hooks + Notice/Rumor projections, doom event; hook lists on Dungeon/Building/DungeonRoom POI templates; Connections panel on NPC/POI detail.
- **Phase 5:** Generation UI in the existing create-realm dialog.

## Global Constraints

- **Branch:** work on `feature/dev-api-map-generation` (current). Never commit feature work to `main`.
- **Field name is `worldId`, never `realmId`** — `realmId`/`realms` are reserved by dexie-cloud-addon. New tables and indexes use `worldId`.
- **Dexie:** current schema version is **35**; add exactly one new version, **`db.version(36)`**. Never edit an already-released `version()`/`upgrade()` block.
- **IDs:** `newId()` from `@shared/ulid` (ULID). Timestamps: `Date.now()` (epoch ms `number`) assigned to both `createdAt` and `updatedAt` at creation.
- **Repo convention:** `create` and `update` are both `db.table.put(...)` (idempotent upsert). One use-case file per operation.
- **Path aliases:** `@domain/*`, `@application/*`, `@infrastructure/*`, `@shared/*`, `@ui/*`, `~/*` → `./src/*`.
- **No Blobs** in synced entities (dexie-cloud); these entities are text-only — fine.
- **Commit** after every task with a conventional-commit message (`feat:`, `test:`, `chore:`).

## File Structure

**Created:**
- `vitest.config.ts` — test runner config (node env, tsconfig path aliases).
- `src/test/setup.ts` — installs `fake-indexeddb/auto`.
- `src/domain/entities/Connection.ts` — polymorphic narrative edge entity.
- `src/domain/entities/Hook.ts` — quest aggregate entity + `HookSecret`.
- `src/infrastructure/dexie/migrations/v36-defaults.ts` — pure backfill default helpers.
- `src/infrastructure/dexie/migrations/v36-defaults.test.ts`
- `src/application/ports/IConnectionRepository.ts`
- `src/application/ports/IHookRepository.ts`
- `src/infrastructure/dexie/repositories/ConnectionRepository.ts`
- `src/infrastructure/dexie/repositories/ConnectionRepository.test.ts`
- `src/infrastructure/dexie/repositories/HookRepository.ts`
- `src/infrastructure/dexie/repositories/HookRepository.test.ts`
- `src/application/use-cases/CreateConnection.ts`
- `src/application/use-cases/CreateHook.ts`
- `src/infrastructure/dexie/db.schema.test.ts` — integration: db opens at v36, tables round-trip.
- `src/infrastructure/container.test.ts`
- `src/lib/hexmap/hex.ts` — pure hex grid math.
- `src/lib/hexmap/hex.test.ts`
- `src/domain/data/worldgen/biomes.ts` — biome list + region-flavor tables.
- `src/domain/data/worldgen/biomes.test.ts`

**Modified:**
- `package.json` — add `test`/`test:watch` scripts, devDeps `vitest` + `fake-indexeddb`.
- `src/domain/entities/Notice.ts` — add `hookId: string | null`.
- `src/domain/entities/Rumor.ts` — add `hookId: string | null`.
- `src/domain/entities/GameMap.ts` — add `kind` + optional hex params.
- `src/infrastructure/dexie/db.ts` — `AppDB` type (add `connections`, `hooks`), `storesV36`, `db.version(36)` upgrade.
- `src/infrastructure/container.ts` — register `connectionRepo`, `hookRepo`.

---

### Task 0: Test harness (Vitest + fake-indexeddb)

No test framework exists in the repo today. This task stands one up and proves it runs.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/sanity.test.ts` (temporary, deleted at end of task)

**Interfaces:**
- Produces: an `npm test` command running Vitest in node env with `@/`-style path aliases resolved and a global IndexedDB polyfill available to all tests.

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest@^2 fake-indexeddb@^6
```

- [ ] **Step 2: Add test scripts to package.json**

In `package.json`, add to the `"scripts"` block:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
  },
})
```

- [ ] **Step 4: Create the setup file**

Create `src/test/setup.ts`:

```ts
// Provides a global `indexedDB` so Dexie can open databases in Node tests.
import 'fake-indexeddb/auto'
```

- [ ] **Step 5: Write a sanity test**

Create `src/test/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('test harness', () => {
  it('runs and resolves @shared alias', async () => {
    const { newId } = await import('@shared/ulid')
    expect(typeof newId()).toBe('string')
  })

  it('has a global indexedDB polyfill', () => {
    expect(typeof indexedDB).not.toBe('undefined')
  })
})
```

- [ ] **Step 6: Run the sanity test**

Run: `npm test -- src/test/sanity.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Delete the sanity test and commit**

```bash
rm src/test/sanity.test.ts
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "chore: add vitest + fake-indexeddb test harness"
```

---

### Task 1: `Connection` & `Hook` entities + field additions + backfill helpers

Pure types plus the two pure default-helpers that the migration will use (so the backfill logic is unit-tested in isolation).

**Files:**
- Create: `src/domain/entities/Connection.ts`
- Create: `src/domain/entities/Hook.ts`
- Modify: `src/domain/entities/Notice.ts`
- Modify: `src/domain/entities/Rumor.ts`
- Modify: `src/domain/entities/GameMap.ts`
- Create: `src/infrastructure/dexie/migrations/v36-defaults.ts`
- Test: `src/infrastructure/dexie/migrations/v36-defaults.test.ts`

**Interfaces:**
- Produces:
  - `interface Connection` (fields below), `type EntityRef`, `type ConnectionKind`, `type ConnectionStatus`.
  - `interface Hook`, `interface HookSecret`, `type HookType`, `type HookStatus`.
  - `Notice.hookId: string | null`, `Rumor.hookId: string | null`, `GameMap.kind: 'image' | 'hex'`.
  - `withHookIdDefault(row)` and `withGameMapKindDefault(map)` pure backfill helpers.

- [ ] **Step 1: Write the failing test for the backfill helpers**

Create `src/infrastructure/dexie/migrations/v36-defaults.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { withHookIdDefault, withGameMapKindDefault } from './v36-defaults'

describe('v36 backfill defaults', () => {
  it('adds hookId: null when missing', () => {
    const row = { id: 'n1', title: 'x' } as Record<string, unknown>
    expect(withHookIdDefault(row).hookId).toBe(null)
  })

  it('preserves an existing hookId', () => {
    const row = { id: 'n1', hookId: 'h9' } as Record<string, unknown>
    expect(withHookIdDefault(row).hookId).toBe('h9')
  })

  it('defaults GameMap.kind to "image" when missing', () => {
    const map = { id: 'm1', imageUrl: 'u' } as Record<string, unknown>
    expect(withGameMapKindDefault(map).kind).toBe('image')
  })

  it('preserves an existing kind', () => {
    const map = { id: 'm1', kind: 'hex' } as Record<string, unknown>
    expect(withGameMapKindDefault(map).kind).toBe('hex')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/infrastructure/dexie/migrations/v36-defaults.test.ts`
Expected: FAIL — cannot resolve `./v36-defaults`.

- [ ] **Step 3: Implement the backfill helpers**

Create `src/infrastructure/dexie/migrations/v36-defaults.ts`:

```ts
/** Pure backfill helpers used by the db.version(36) upgrade. */

export function withHookIdDefault<T extends Record<string, unknown>>(row: T): T {
  if (row.hookId === undefined) return { ...row, hookId: null }
  return row
}

export function withGameMapKindDefault<T extends Record<string, unknown>>(map: T): T {
  if (map.kind === undefined) return { ...map, kind: 'image' }
  return map
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/infrastructure/dexie/migrations/v36-defaults.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create the `Connection` entity**

Create `src/domain/entities/Connection.ts`:

```ts
export type EntityRef = 'npc' | 'faction' | 'poi' | 'item'

export type ConnectionKind =
  | 'parent' | 'child' | 'spouse' | 'sibling' | 'lover'
  | 'rival' | 'enemy' | 'ally'
  | 'debtor' | 'creditor' | 'thief' | 'victim'
  | 'captive_in' | 'hides' | 'wants'

export type ConnectionStatus =
  | 'active' | 'missing' | 'estranged' | 'dead' | 'resolved'

export interface Connection {
  id: string
  worldId: string
  fromType: EntityRef
  fromId: string
  toType: EntityRef
  toId: string
  kind: ConnectionKind
  label: string
  status: ConnectionStatus
  hookId: string | null
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 6: Create the `Hook` entity**

Create `src/domain/entities/Hook.ts`:

```ts
export type HookType =
  | 'missing_person' | 'lost_item' | 'theft' | 'relation'
  | 'revenge' | 'delivery' | 'escort' | 'artifact'

export type HookStatus = 'open' | 'active' | 'resolved' | 'abandoned'

export interface HookSecret {
  kind: 'captive' | 'hidden_item' | 'culprit' | 'destination' | 'truth'
  targetType: 'poi' | 'npc' | 'faction'
  targetId: string
  detail: string
}

export interface Hook {
  id: string
  worldId: string
  type: HookType
  title: string
  status: HookStatus
  contactNpcId: string | null
  rewardText: string
  secret: HookSecret
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 7: Add `hookId` to Notice and Rumor**

In `src/domain/entities/Notice.ts`, add to the `Notice` interface (after `contactNpcId`):

```ts
  hookId: string | null
```

In `src/domain/entities/Rumor.ts`, add to the `Rumor` interface (after `isQuestHook`):

```ts
  hookId: string | null
```

- [ ] **Step 8: Add `kind` + hex params to GameMap**

In `src/domain/entities/GameMap.ts`, add to the `GameMap` interface (after `imageUrl`):

```ts
  kind: 'image' | 'hex'
  hexCols: number | null
  hexRows: number | null
  hexSize: number | null
  hexOrientation: 'pointy' | 'flat' | null
```

- [ ] **Step 9: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes (no errors introduced by the new/edited types).

```bash
git add src/domain/entities/Connection.ts src/domain/entities/Hook.ts \
  src/domain/entities/Notice.ts src/domain/entities/Rumor.ts src/domain/entities/GameMap.ts \
  src/infrastructure/dexie/migrations/v36-defaults.ts \
  src/infrastructure/dexie/migrations/v36-defaults.test.ts
git commit -m "feat: add Connection + Hook entities, hookId/kind fields, v36 backfill helpers"
```

---

### Task 2: Dexie `version(36)` schema migration

Register the two new tables, add the `hookId`/`kind` indexes, and backfill existing rows using the Task 1 helpers.

**Files:**
- Modify: `src/infrastructure/dexie/db.ts`
- Test: `src/infrastructure/dexie/db.schema.test.ts`

**Interfaces:**
- Consumes: `withHookIdDefault`, `withGameMapKindDefault` (Task 1); `Connection`, `Hook` types (Task 1).
- Produces: `db.connections` and `db.hooks` tables on the exported `db`; schema at version 36.

- [ ] **Step 1: Write the failing integration test**

Create `src/infrastructure/dexie/db.schema.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { db } from './db'
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'

beforeAll(async () => {
  await db.open()
})

describe('db schema v36', () => {
  it('opens at version 36', () => {
    expect(db.verno).toBe(36)
  })

  it('round-trips a Connection and queries by both endpoints', async () => {
    const c: Connection = {
      id: 'c1', worldId: 'w1',
      fromType: 'npc', fromId: 'npcA',
      toType: 'poi', toId: 'poiB',
      kind: 'captive_in', label: '', status: 'missing',
      hookId: 'h1', createdAt: 1, updatedAt: 1,
    }
    await db.connections.put(c)
    const byFrom = await db.connections.where('[worldId+fromId]').equals(['w1', 'npcA']).toArray()
    const byTo = await db.connections.where('[worldId+toId]').equals(['w1', 'poiB']).toArray()
    expect(byFrom).toHaveLength(1)
    expect(byTo).toHaveLength(1)
  })

  it('round-trips a Hook', async () => {
    const h: Hook = {
      id: 'h1', worldId: 'w1', type: 'missing_person', title: 'Find her',
      status: 'open', contactNpcId: 'npcA', rewardText: '10gp',
      secret: { kind: 'captive', targetType: 'poi', targetId: 'poiB', detail: 'in the tomb' },
      createdAt: 1, updatedAt: 1,
    }
    await db.hooks.put(h)
    expect((await db.hooks.get('h1'))?.title).toBe('Find her')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/infrastructure/dexie/db.schema.test.ts`
Expected: FAIL — `db.connections` is undefined / version is 35.

- [ ] **Step 3: Add the new tables to the `AppDB` type**

In `src/infrastructure/dexie/db.ts`, add imports near the other entity imports:

```ts
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'
```

Add to the `AppDB` type (after the `customCompendiumEntries` line):

```ts
  connections: EntityTable<Connection, 'id'>
  hooks: EntityTable<Hook, 'id'>
```

- [ ] **Step 4: Add the v36 store map and migration**

In `src/infrastructure/dexie/db.ts`, add the import for the backfill helpers near the top:

```ts
import { withHookIdDefault, withGameMapKindDefault } from './migrations/v36-defaults'
```

Immediately AFTER the existing `db.version(35)...` block, add:

```ts
const storesV36 = {
  ...storesV26,
  connections: 'id, worldId, fromId, toId, hookId, [worldId+fromId], [worldId+toId]',
  hooks: 'id, worldId, status, contactNpcId',
  notices: 'id, poiId, regionId, worldId, type, isUsed, hookId',
  rumors: 'id, poiId, regionId, worldId, isUsed, hookId',
  gameMaps: 'id, ownerRealmId, ownerPoiId, kind',
}

// v36: narrative graph (connections) + quest aggregate (hooks);
// backfill hookId on notices/rumors and kind on gameMaps.
db.version(36).stores(storesV36).upgrade(async (tx) => {
  for (const table of ['notices', 'rumors']) {
    const rows = await tx.table(table).toArray()
    for (const row of rows) {
      await tx.table(table).put(withHookIdDefault(row))
    }
  }
  const maps = await tx.table('gameMaps').toArray()
  for (const map of maps) {
    await tx.table('gameMaps').put(withGameMapKindDefault(map))
  }
})
```

- [ ] **Step 5: Run the integration test to verify it passes**

Run: `npm test -- src/infrastructure/dexie/db.schema.test.ts`
Expected: PASS (3 tests). `db.verno` is 36; both tables round-trip; compound-index queries return the row.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/infrastructure/dexie/db.ts src/infrastructure/dexie/db.schema.test.ts
git commit -m "feat: add Dexie v36 migration for connections/hooks + hookId/kind"
```

---

### Task 3: `Connection` repository, port, use-case

**Files:**
- Create: `src/application/ports/IConnectionRepository.ts`
- Create: `src/infrastructure/dexie/repositories/ConnectionRepository.ts`
- Create: `src/application/use-cases/CreateConnection.ts`
- Test: `src/infrastructure/dexie/repositories/ConnectionRepository.test.ts`

**Interfaces:**
- Consumes: `Connection` type; `db.connections` table (Task 2).
- Produces:
  - `IConnectionRepository` with `getByEntity(worldId, entityId): Promise<Connection[]>`, `getByHook(hookId): Promise<Connection[]>`, `create(c): Promise<void>`, `bulkCreate(cs): Promise<void>`, `delete(id): Promise<void>`.
  - `executeCreateConnection(input, deps): Promise<Connection>`.

- [ ] **Step 1: Write the failing repository test**

Create `src/infrastructure/dexie/repositories/ConnectionRepository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { ConnectionRepository } from './ConnectionRepository'
import type { Connection } from '@domain/entities/Connection'

const repo = new ConnectionRepository()

function make(id: string, over: Partial<Connection> = {}): Connection {
  return {
    id, worldId: 'w1',
    fromType: 'npc', fromId: 'A', toType: 'poi', toId: 'B',
    kind: 'captive_in', label: '', status: 'missing',
    hookId: null, createdAt: 1, updatedAt: 1, ...over,
  }
}

beforeEach(async () => {
  await db.open()
  await db.connections.clear()
})

describe('ConnectionRepository', () => {
  it('getByEntity returns edges touching either endpoint, de-duplicated', async () => {
    await repo.create(make('c1', { fromId: 'A', toId: 'B' }))
    await repo.create(make('c2', { fromId: 'X', toId: 'A' }))
    await repo.create(make('c3', { fromId: 'Y', toId: 'Z' }))
    const edges = await repo.getByEntity('w1', 'A')
    expect(edges.map((e) => e.id).sort()).toEqual(['c1', 'c2'])
  })

  it('bulkCreate inserts many', async () => {
    await repo.bulkCreate([make('c1'), make('c2'), make('c3')])
    expect(await db.connections.count()).toBe(3)
  })

  it('getByHook filters by hookId', async () => {
    await repo.bulkCreate([make('c1', { hookId: 'h1' }), make('c2', { hookId: 'h2' })])
    const edges = await repo.getByHook('h1')
    expect(edges).toHaveLength(1)
    expect(edges[0].id).toBe('c1')
  })

  it('delete removes an edge', async () => {
    await repo.create(make('c1'))
    await repo.delete('c1')
    expect(await db.connections.get('c1')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/infrastructure/dexie/repositories/ConnectionRepository.test.ts`
Expected: FAIL — cannot resolve `./ConnectionRepository`.

- [ ] **Step 3: Create the port**

Create `src/application/ports/IConnectionRepository.ts`:

```ts
import type { Connection } from '@domain/entities/Connection'

export interface IConnectionRepository {
  getByEntity(worldId: string, entityId: string): Promise<Connection[]>
  getByHook(hookId: string): Promise<Connection[]>
  create(connection: Connection): Promise<void>
  bulkCreate(connections: Connection[]): Promise<void>
  update(connection: Connection): Promise<void>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 4: Create the repository**

Create `src/infrastructure/dexie/repositories/ConnectionRepository.ts`:

```ts
import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type { Connection } from '@domain/entities/Connection'
import { db } from '../db'

export class ConnectionRepository implements IConnectionRepository {
  async getByEntity(worldId: string, entityId: string): Promise<Connection[]> {
    const [from, to] = await Promise.all([
      db.connections.where('[worldId+fromId]').equals([worldId, entityId]).toArray(),
      db.connections.where('[worldId+toId]').equals([worldId, entityId]).toArray(),
    ])
    const byId = new Map<string, Connection>()
    for (const c of [...from, ...to]) byId.set(c.id, c)
    return [...byId.values()]
  }

  async getByHook(hookId: string): Promise<Connection[]> {
    return db.connections.where('hookId').equals(hookId).toArray()
  }

  async create(connection: Connection): Promise<void> {
    await db.connections.put(connection)
  }

  async bulkCreate(connections: Connection[]): Promise<void> {
    await db.connections.bulkPut(connections)
  }

  async update(connection: Connection): Promise<void> {
    await db.connections.put(connection)
  }

  async delete(id: string): Promise<void> {
    await db.connections.delete(id)
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/infrastructure/dexie/repositories/ConnectionRepository.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Create the use-case**

Create `src/application/use-cases/CreateConnection.ts`:

```ts
import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type {
  Connection, EntityRef, ConnectionKind, ConnectionStatus,
} from '@domain/entities/Connection'
import { newId } from '@shared/ulid'

export interface CreateConnectionInput {
  worldId: string
  fromType: EntityRef
  fromId: string
  toType: EntityRef
  toId: string
  kind: ConnectionKind
  label?: string
  status?: ConnectionStatus
  hookId?: string | null
}

export async function executeCreateConnection(
  input: CreateConnectionInput,
  deps: { connectionRepo: IConnectionRepository }
): Promise<Connection> {
  const now = Date.now()
  const connection: Connection = {
    id: newId(),
    worldId: input.worldId,
    fromType: input.fromType,
    fromId: input.fromId,
    toType: input.toType,
    toId: input.toId,
    kind: input.kind,
    label: input.label ?? '',
    status: input.status ?? 'active',
    hookId: input.hookId ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await deps.connectionRepo.create(connection)
  return connection
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/application/ports/IConnectionRepository.ts \
  src/infrastructure/dexie/repositories/ConnectionRepository.ts \
  src/infrastructure/dexie/repositories/ConnectionRepository.test.ts \
  src/application/use-cases/CreateConnection.ts
git commit -m "feat: add Connection repository, port, and create use-case"
```

---

### Task 4: `Hook` repository, port, use-case

**Files:**
- Create: `src/application/ports/IHookRepository.ts`
- Create: `src/infrastructure/dexie/repositories/HookRepository.ts`
- Create: `src/application/use-cases/CreateHook.ts`
- Test: `src/infrastructure/dexie/repositories/HookRepository.test.ts`

**Interfaces:**
- Consumes: `Hook`, `HookSecret`, `HookType` types; `db.hooks` table (Task 2).
- Produces:
  - `IHookRepository` with `getById(id)`, `getByWorld(worldId)`, `create(h)`, `bulkCreate(hs)`, `update(h)`, `delete(id)`.
  - `executeCreateHook(input, deps): Promise<Hook>`.

- [ ] **Step 1: Write the failing repository test**

Create `src/infrastructure/dexie/repositories/HookRepository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { HookRepository } from './HookRepository'
import type { Hook } from '@domain/entities/Hook'

const repo = new HookRepository()

function make(id: string, over: Partial<Hook> = {}): Hook {
  return {
    id, worldId: 'w1', type: 'missing_person', title: 't',
    status: 'open', contactNpcId: 'A', rewardText: '',
    secret: { kind: 'captive', targetType: 'poi', targetId: 'B', detail: '' },
    createdAt: 1, updatedAt: 1, ...over,
  }
}

beforeEach(async () => {
  await db.open()
  await db.hooks.clear()
})

describe('HookRepository', () => {
  it('create + getById round-trips, preserving the structured secret', async () => {
    await repo.create(make('h1', { secret: { kind: 'captive', targetType: 'poi', targetId: 'B', detail: 'tomb' } }))
    const got = await repo.getById('h1')
    expect(got?.secret.targetId).toBe('B')
    expect(got?.secret.detail).toBe('tomb')
  })

  it('getByWorld returns only that world', async () => {
    await repo.bulkCreate([make('h1', { worldId: 'w1' }), make('h2', { worldId: 'w2' })])
    const got = await repo.getByWorld('w1')
    expect(got.map((h) => h.id)).toEqual(['h1'])
  })

  it('delete removes a hook', async () => {
    await repo.create(make('h1'))
    await repo.delete('h1')
    expect(await repo.getById('h1')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/infrastructure/dexie/repositories/HookRepository.test.ts`
Expected: FAIL — cannot resolve `./HookRepository`.

- [ ] **Step 3: Create the port**

Create `src/application/ports/IHookRepository.ts`:

```ts
import type { Hook } from '@domain/entities/Hook'

export interface IHookRepository {
  getById(id: string): Promise<Hook | undefined>
  getByWorld(worldId: string): Promise<Hook[]>
  create(hook: Hook): Promise<void>
  bulkCreate(hooks: Hook[]): Promise<void>
  update(hook: Hook): Promise<void>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 4: Create the repository**

Create `src/infrastructure/dexie/repositories/HookRepository.ts`:

```ts
import type { IHookRepository } from '@application/ports/IHookRepository'
import type { Hook } from '@domain/entities/Hook'
import { db } from '../db'

export class HookRepository implements IHookRepository {
  async getById(id: string): Promise<Hook | undefined> {
    return db.hooks.get(id)
  }

  async getByWorld(worldId: string): Promise<Hook[]> {
    return db.hooks.where('worldId').equals(worldId).toArray()
  }

  async create(hook: Hook): Promise<void> {
    await db.hooks.put(hook)
  }

  async bulkCreate(hooks: Hook[]): Promise<void> {
    await db.hooks.bulkPut(hooks)
  }

  async update(hook: Hook): Promise<void> {
    await db.hooks.put(hook)
  }

  async delete(id: string): Promise<void> {
    await db.hooks.delete(id)
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/infrastructure/dexie/repositories/HookRepository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Create the use-case**

Create `src/application/use-cases/CreateHook.ts`:

```ts
import type { IHookRepository } from '@application/ports/IHookRepository'
import type { Hook, HookType, HookSecret } from '@domain/entities/Hook'
import { newId } from '@shared/ulid'

export interface CreateHookInput {
  worldId: string
  type: HookType
  title: string
  secret: HookSecret
  contactNpcId?: string | null
  rewardText?: string
}

export async function executeCreateHook(
  input: CreateHookInput,
  deps: { hookRepo: IHookRepository }
): Promise<Hook> {
  const now = Date.now()
  const hook: Hook = {
    id: newId(),
    worldId: input.worldId,
    type: input.type,
    title: input.title,
    status: 'open',
    contactNpcId: input.contactNpcId ?? null,
    rewardText: input.rewardText ?? '',
    secret: input.secret,
    createdAt: now,
    updatedAt: now,
  }
  await deps.hookRepo.create(hook)
  return hook
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/application/ports/IHookRepository.ts \
  src/infrastructure/dexie/repositories/HookRepository.ts \
  src/infrastructure/dexie/repositories/HookRepository.test.ts \
  src/application/use-cases/CreateHook.ts
git commit -m "feat: add Hook repository, port, and create use-case"
```

---

### Task 5: Container wiring

**Files:**
- Modify: `src/infrastructure/container.ts`
- Test: `src/infrastructure/container.test.ts`

**Interfaces:**
- Consumes: `ConnectionRepository` (Task 3), `HookRepository` (Task 4).
- Produces: `container.connectionRepo`, `container.hookRepo` on the `Container` type.

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/container.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createContainer } from './container'

describe('createContainer', () => {
  it('exposes connectionRepo and hookRepo', () => {
    const c = createContainer()
    expect(c.connectionRepo).toBeDefined()
    expect(c.hookRepo).toBeDefined()
    expect(typeof c.connectionRepo.getByEntity).toBe('function')
    expect(typeof c.hookRepo.getById).toBe('function')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/infrastructure/container.test.ts`
Expected: FAIL — `c.connectionRepo` is undefined.

- [ ] **Step 3: Wire the repositories**

In `src/infrastructure/container.ts`, add imports with the other repository imports:

```ts
import { ConnectionRepository } from '@infrastructure/dexie/repositories/ConnectionRepository'
import { HookRepository } from '@infrastructure/dexie/repositories/HookRepository'
```

Add to the object returned by `createContainer()` (before `eventBus`):

```ts
    connectionRepo: new ConnectionRepository(),
    hookRepo: new HookRepository(),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/infrastructure/container.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/infrastructure/container.ts src/infrastructure/container.test.ts
git commit -m "feat: wire Connection and Hook repositories into the container"
```

---

### Task 6: Hex-grid math library

Pure, deterministic functions the Phase 2 renderer and Phase 3 generator both depend on. Uses **axial coordinates** (`q`, `r`) with **pointy-top** hexes; pixel space matches the flat coordinate system the maps already use.

**Files:**
- Create: `src/lib/hexmap/hex.ts`
- Test: `src/lib/hexmap/hex.test.ts`

**Interfaces:**
- Produces:
  - `interface Axial { q: number; r: number }`
  - `interface Point { x: number; y: number }`
  - `axialToPixel(h: Axial, size: number): Point` — pointy-top center.
  - `pixelToAxial(p: Point, size: number): Axial` — inverse, rounded to nearest hex.
  - `hexNeighbors(h: Axial): Axial[]` — the 6 adjacent hexes.
  - `hexDistance(a: Axial, b: Axial): number` — grid steps.
  - `hexCorners(center: Point, size: number): Point[]` — the 6 polygon corners (pointy-top).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/hexmap/hex.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  axialToPixel, pixelToAxial, hexNeighbors, hexDistance, hexCorners,
} from './hex'

describe('hex math', () => {
  it('axialToPixel → pixelToAxial round-trips for a spread of hexes', () => {
    const size = 24
    for (const h of [{ q: 0, r: 0 }, { q: 3, r: -2 }, { q: -4, r: 5 }, { q: 7, r: 1 }]) {
      const back = pixelToAxial(axialToPixel(h, size), size)
      expect(back).toEqual(h)
    }
  })

  it('the origin hex sits at pixel (0,0)', () => {
    expect(axialToPixel({ q: 0, r: 0 }, 24)).toEqual({ x: 0, y: 0 })
  })

  it('hexNeighbors returns 6 distinct adjacent hexes', () => {
    const ns = hexNeighbors({ q: 2, r: 2 })
    expect(ns).toHaveLength(6)
    expect(new Set(ns.map((n) => `${n.q},${n.r}`)).size).toBe(6)
    for (const n of ns) expect(hexDistance({ q: 2, r: 2 }, n)).toBe(1)
  })

  it('hexDistance is symmetric and zero to self', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(hexDistance({ q: 3, r: -1 }, { q: 0, r: 0 }))
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3)
  })

  it('hexCorners returns 6 points around the center', () => {
    const corners = hexCorners({ x: 0, y: 0 }, 10)
    expect(corners).toHaveLength(6)
    for (const c of corners) {
      const radius = Math.hypot(c.x, c.y)
      expect(radius).toBeGreaterThan(9.9)
      expect(radius).toBeLessThan(10.1)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/hexmap/hex.test.ts`
Expected: FAIL — cannot resolve `./hex`.

- [ ] **Step 3: Implement the hex math**

Create `src/lib/hexmap/hex.ts`:

```ts
export interface Axial {
  q: number
  r: number
}

export interface Point {
  x: number
  y: number
}

// Pointy-top axial → pixel center.
export function axialToPixel(h: Axial, size: number): Point {
  const x = size * Math.sqrt(3) * (h.q + h.r / 2)
  const y = size * (3 / 2) * h.r
  return { x, y }
}

// Pixel → nearest axial hex (inverse of axialToPixel, with cube rounding).
export function pixelToAxial(p: Point, size: number): Axial {
  const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / size
  const r = ((2 / 3) * p.y) / size
  return cubeRound(q, r)
}

function cubeRound(qf: number, rf: number): Axial {
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q, r }
}

const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
]

export function hexNeighbors(h: Axial): Axial[] {
  return AXIAL_DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }))
}

export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

// Pointy-top corners, starting at the top-right and going clockwise.
export function hexCorners(center: Point, size: number): Point[] {
  const corners: Point[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    corners.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    })
  }
  return corners
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/hexmap/hex.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/lib/hexmap/hex.ts src/lib/hexmap/hex.test.ts
git commit -m "feat: add pure hex-grid math library"
```

---

### Task 7: Worldgen content-table scaffolding

Establishes the `src/domain/data/worldgen/` home and the biome model, reusing the existing `SeededRandom` + `WeightedTable` rather than inventing an RNG. Proves a biome-keyed flavor pick is deterministic.

**Files:**
- Create: `src/domain/data/worldgen/biomes.ts`
- Test: `src/domain/data/worldgen/biomes.test.ts`

**Interfaces:**
- Consumes: `SeededRandom`, `WeightedTable`, `createWeightedTable` from `~/lib/dungeon/SeededRandom`.
- Produces:
  - `type Biome` (the 9 land biomes + `lake`).
  - `BIOMES: Biome[]`.
  - `BIOME_FEATURE_TABLES: Record<Biome, WeightedTable<string>>`.
  - `pickBiomeFeature(biome: Biome, rng: SeededRandom): string`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/data/worldgen/biomes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { BIOMES, BIOME_FEATURE_TABLES, pickBiomeFeature } from './biomes'

describe('worldgen biomes', () => {
  it('defines the 9 land biomes plus lake', () => {
    expect(BIOMES).toEqual([
      'forest', 'mountains', 'grasslands', 'desert', 'marsh',
      'frozen', 'blighted', 'hills', 'jungle', 'lake',
    ])
  })

  it('has a non-empty feature table for every biome', () => {
    for (const b of BIOMES) {
      expect(BIOME_FEATURE_TABLES[b].entries.length).toBeGreaterThan(0)
    }
  })

  it('pickBiomeFeature is deterministic for a given seed', () => {
    const a = pickBiomeFeature('forest', new SeededRandom('seed-1'))
    const b = pickBiomeFeature('forest', new SeededRandom('seed-1'))
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/domain/data/worldgen/biomes.test.ts`
Expected: FAIL — cannot resolve `./biomes`.

- [ ] **Step 3: Implement the biome scaffolding**

Create `src/domain/data/worldgen/biomes.ts`:

```ts
import {
  SeededRandom,
  createWeightedTable,
  type WeightedTable,
} from '~/lib/dungeon/SeededRandom'

export type Biome =
  | 'forest' | 'mountains' | 'grasslands' | 'desert' | 'marsh'
  | 'frozen' | 'blighted' | 'hills' | 'jungle' | 'lake'

export const BIOMES: Biome[] = [
  'forest', 'mountains', 'grasslands', 'desert', 'marsh',
  'frozen', 'blighted', 'hills', 'jungle', 'lake',
]

// Region "feature" flavor per biome. Re-authored content (no third-party text).
// Weights are relative; higher = more common.
export const BIOME_FEATURE_TABLES: Record<Biome, WeightedTable<string>> = {
  forest: createWeightedTable({
    'a moss-choked standing stone': 3,
    'a charcoal-burner’s abandoned camp': 2,
    'a grove the locals refuse to enter': 1,
  }),
  mountains: createWeightedTable({
    'a collapsed mine adit': 3,
    'a windswept watchtower': 2,
    'an eagle-haunted high pass': 1,
  }),
  grasslands: createWeightedTable({
    'a lone burial mound': 3,
    'a crossroads shrine': 2,
    'a ruined drover’s inn': 1,
  }),
  desert: createWeightedTable({
    'a half-buried obelisk': 3,
    'a dry oasis with a poisoned well': 2,
    'a caravan picked clean by the sands': 1,
  }),
  marsh: createWeightedTable({
    'a sunken boardwalk': 3,
    'a witch’s stilted hut': 2,
    'a will-o’-wisp bog': 1,
  }),
  frozen: createWeightedTable({
    'a glacier-cracked cairn': 3,
    'a frozen-over hot spring': 2,
    'a mammoth carcass on the ice': 1,
  }),
  blighted: createWeightedTable({
    'a field of ash where nothing grows': 3,
    'a circle of blackened standing stones': 2,
    'a corpse-road lined with crows': 1,
  }),
  hills: createWeightedTable({
    'a barrow with a broken seal': 3,
    'a shepherd’s ring of stones': 2,
    'an old beacon-hill': 1,
  }),
  jungle: createWeightedTable({
    'a vine-swallowed step pyramid': 3,
    'a river idol slick with offerings': 2,
    'a clearing of enormous bones': 1,
  }),
  lake: createWeightedTable({
    'a rotting jetty': 3,
    'an island with a single dark tower': 2,
    'a drowned bell that tolls underwater': 1,
  }),
}

export function pickBiomeFeature(biome: Biome, rng: SeededRandom): string {
  return rng.pickWeighted(BIOME_FEATURE_TABLES[biome])
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/domain/data/worldgen/biomes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the FULL suite and typecheck**

Run: `npm test`
Expected: PASS — all Phase 1 tests green.

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/domain/data/worldgen/biomes.ts src/domain/data/worldgen/biomes.test.ts
git commit -m "feat: scaffold worldgen biome content tables"
```

---

## Phase 1 Definition of Done

- `npm test` runs and all tests pass; `npx tsc --noEmit` is clean.
- `db` opens at version 36 with `connections` and `hooks` tables; existing `notices`/`rumors` rows backfill `hookId: null`, `gameMaps` rows backfill `kind: 'image'`.
- `Connection` and `Hook` repositories exist, are wired into the container, and expose `bulkCreate` for the Phase 3 bulk-write commit.
- `getByEntity(worldId, entityId)` returns edges from both endpoints, de-duplicated — the query the Phase 4 Connections panel relies on.
- Hex math (`src/lib/hexmap/hex.ts`) and biome tables (`src/domain/data/worldgen/biomes.ts`) are pure and deterministic, ready for Phase 2 (render) and Phase 3 (generation).

## Notes for later phases

- The full migration-from-v35 backfill is exercised indirectly (helper unit tests + a fresh-v36 integration test). A manual check in the running app against an existing realm is worthwhile before release, since fake-indexeddb starts fresh at v36.
- Phase 3's `GenerateWorldUseCase` must use `bulkCreate` + a single `db.transaction('rw', [...tables], ...)` (see spec §5b). The `bulkCreate` methods added here are the building blocks.
- The danger-scaling decision (v1 narrative NPCs use baseline stats) and the lazy-dungeon-stub rule live in the spec; they bind Phase 3, not Phase 1.
