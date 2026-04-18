# Database Migration Plan: Dexie → PGlite + Electric SQL

## Use Case

This is a **single-user, multi-device sync** problem — think Notes app, not Google Docs. Each user has their own isolated database of realms/worlds that needs to stay in sync across their own devices (e.g. iPad + laptop). Users do not share data with each other, there is no collaboration, and there is no multi-tenancy.

Up to ~10 independent users are expected. Each user's data is completely siloed from every other user's data.

This framing removes the need for:
- Conflict resolution (one person isn't editing on two devices simultaneously)
- A shared database or auth layer between users
- Complex multi-tenant infrastructure

---

## Decision

Replace Dexie.js (IndexedDB wrapper) with **PGlite** (SQLite in-browser via WASM) for local storage, and **Electric SQL** as the optional sync layer for cross-device sync.

### Options Evaluated

| Option | Verdict | Reason |
|---|---|---|
| **Dexie Cloud** | ❌ No | Unreliable in practice; sync broke unpredictably; hit 100MB free tier limit |
| **LiveStore** | ❌ No | Migration was very buggy (bindValues, JSON parsing, LIMIT params); 3-second WASM+OPFS+dual-worker load on every page load; event-sourcing model added significant complexity |
| **Dexie.Syncable** | ❌ No | Unmaintained for years; only community sync server is 8-9 years old (Node 6 era); no viable path |
| **Convex** | ❌ No | Not local-first — requires network for every read/write; no offline support |
| **TanStack DB** | ❌ No | Sync-first architecture; no IndexedDB persistence for large data; LocalStorage cap ~5MB; built for small real-time documents, not 20MB realm files |
| **PartyKit / Liveblocks** | ❌ No | Designed for small real-time documents; 20MB realm files would be problematic |
| **Yjs / Automerge (CRDTs)** | ❌ No | CRDT overhead on 20MB structured data is expensive; overkill for single-user sync |
| **Turso embedded replica** | ❌ No | Embedded replica requires native file I/O — Node.js only. Browser client is HTTP-to-remote only. Not local-first. |
| **Roll your own sync server** | ❌ No | Overkill for a single-user-per-instance problem; Electric SQL already solves this cleanly |
| **Anytype / any-sync** | ❌ No | Excellent local-first + P2P but built on custom Go middleware with proprietary CRDT protocol — multi-year engineering investment, not applicable to a browser PWA |
| **PGlite + Electric SQL** | ✅ Yes | True local-first (WASM SQLite, persists to OPFS/IndexedDB); row-level sync (20MB realm = only changed rows sync); Electric cloud = works from anywhere, one token per user, fully siloed; sync is opt-in and additive |

### Why PGlite + Electric SQL

- Reads/writes never need network — app works fully offline
- Real SQL queries locally, no event-sourcing complexity
- Row-level sync — 20MB realm files are irrelevant, only deltas move
- Electric SQL cloud: each user gets their own project token, data is completely siloed
- Token configured once in app settings — no login flow, no auth layer to build
- Users without a token use JSON export/import for manual sync
- Phase 1 (local PGlite swap) ships independently of sync

---

## Load Time vs LiveStore

**LiveStore caused a ~3 second load on every page load** because it spun up:
- A dedicated Web Worker + SharedWorker
- WASM binary download + compile
- OPFS file handle initialization
- Schema migration check

**PGlite does not have this problem.** Key differences:
- No workers — PGlite runs on the main thread (or a single optional worker)
- WASM is smaller and faster to init (~50-100ms on repeat loads)
- OPFS is optional — IndexedDB persistence is available as the default
- No shared worker coordination overhead
- No materializer/event-sourcing layer

First load will download the PGlite WASM binary (~1MB) once. After that, cached by the browser/service worker. Subsequent loads are fast — just opening the existing SQLite file.

---

## Current Architecture (Dexie)

- `src/infrastructure/dexie/db.ts` — Dexie schema with 21 tables, versioned migrations
- `src/infrastructure/dexie/repositories/` — 21 repos, all use `db.table.where(...).toArray()`
- Reactivity via `useLiveQuery(...)` from `dexie-react-hooks`
- IDs are ULIDs (string), stored as-is

---

## Target Architecture (PGlite)

### Storage
- **PGlite** (`@electric-sql/pglite`) — PostgreSQL-compatible DB running fully in-browser (WASM). Persists to IndexedDB or OPFS. No server needed.

### Reactivity
- PGlite live query plugin (`@electric-sql/pglite/live`) replaces `useLiveQuery`
- Pattern: `useLiveQuery(() => db.table...)` → `db.live.query(sql, params, callback)` wrapped in a hook

### Sync (Phase 2 — opt-in per user)
- **Electric SQL cloud** — user pastes their Electric project URL + token into app settings once
- Syncs PGlite to Electric's hosted Postgres via shape subscriptions
- Each user's Electric project is completely isolated from all other users
- App works fully offline without it

---

## Schema Translation

All 21 Dexie tables become SQL tables. Key patterns:

| Dexie | SQL |
|---|---|
| `++id` (auto-int) | `id TEXT PRIMARY KEY` (keep ULIDs) |
| `[a+b]` compound index | `CREATE INDEX ON table (a, b)` |
| `*tags` multi-entry index | JSON column |
| Nested objects (e.g. `systemBlock`, `stats`) | JSON column (`TEXT` with JSON) |
| `date.year / date.season / date.day` | Flat columns |

Tables: `systemConfigs`, `worlds`, `regions`, `factions`, `npcs`, `factionRelationships`, `pois`, `paths`, `realmNotes`, `worldEvents`, `weatherHistory`, `tableSets`, `tableDefs`, `rollHistory`, `factionPresences`, `poiEvents`, `gameMaps`, `rumors`, `notices`, `encounterTables`, `entityNotes`, `customCompendiumEntries`

---

## Migration Phases

### Phase 1 — Local swap (Dexie out, PGlite in)
1. Install `@electric-sql/pglite`
2. Remove `dexie`, `dexie-react-hooks`
3. Write `src/db/schema.sql` — all CREATE TABLE + INDEX statements
4. Rewrite `src/infrastructure/db.ts` as PGlite init + schema bootstrap
5. Rewrite all 21 repositories to use SQL (mechanical, one at a time)
6. Replace all `useLiveQuery` calls with PGlite live query hooks
7. One-time migration on first boot: detect old Dexie DB → serialize via `ExportRealm` → insert into PGlite → flag complete in localStorage

**Key difference from LiveStore migration:** No event sourcing, no workers, no materializers. Just SQL reads and writes — much closer to what Dexie already does conceptually.

### Phase 2 — Electric SQL sync (opt-in per user)
1. Add Electric project URL + token fields to app settings page
2. When configured, initialize Electric sync client alongside PGlite
3. Configure shape subscriptions per entity type
4. Conflicts: last-write-wins by `updatedAt` (single user, not editing simultaneously on two devices)
5. Repositories unchanged — Electric handles replication transparently

---

## Data Migration Strategy

On first boot after upgrade:
1. Check if old Dexie database exists (`indexedDB.databases()`)
2. If yes: use existing `ExportRealm.ts` to serialize all data → insert into PGlite in dependency order
3. Flag migration complete in `localStorage`
4. If no Dexie DB found: fresh start

---

## Open Questions

1. **OPFS vs IndexedDB for PGlite persistence?** OPFS is faster but has Safari/iPad constraints. Start with IndexedDB, test OPFS on iPad before switching.
2. **Live query performance on large realms?** PGlite live queries re-run full SQL on every write to watched tables. Should be fine at this data size — benchmark with a large realm before shipping.
3. **Electric SQL free tier limits?** Confirm limits cover personal use before recommending to users.

---

## Packages

Remove:
- `dexie`
- `dexie-react-hooks`
- `@livestore/*` (from abandoned migration branch — do not merge that branch)

Add:
- `@electric-sql/pglite`
- `electric-sql` (Phase 2 only)
