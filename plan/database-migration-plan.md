# Database Migration Plan: Dexie → PGlite + Electric SQL

## Decision

Replace Dexie.js (IndexedDB wrapper) with **PGlite** (SQLite in-browser via WASM) for local storage, and **Electric SQL** as the sync layer between devices (iPad ↔ desktop).

**Why not Dexie Cloud:** Unreliable in practice; adds a third-party dependency on their cloud service.  
**Why not Convex:** Not a good fit for a local-first, offline-capable app. Requires network for all reads/writes.  
**Why PGlite + Electric:** True local-first (reads/writes never need network), real SQL queries, Electric SQL handles sync as a separate concern we can bolt on after the local migration is solid.

---

## Current Architecture (Dexie)

- `src/db/db.ts` — Dexie schema with 18 tables, versioned migrations
- `src/infrastructure/repositories/` — One repo per entity, all use `db.table.where(...).toArray()`
- Reactivity via `useLiveQuery(...)` from `dexie-react-hooks`
- IDs are ULIDs (string), stored as-is

---

## Target Architecture (PGlite)

### Storage
- **PGlite** (`@electric-sql/pglite`) — SQLite-compatible DB running fully in-browser (WASM). Persists to IndexedDB or OPFS. No server needed.

### Sync (Phase 2, after local migration is stable)
- **Electric SQL** (`electric-sql`) — syncs PGlite to a Postgres server via Electric's protocol. Self-hostable (Docker). Free for personal use.
- Sync is opt-in; app works fully offline without it.

### Reactivity
- PGlite has a live query plugin (`@electric-sql/pglite/live`) that replaces `useLiveQuery`
- Pattern: `useLiveQuery` → `db.live.query(sql, params)` wrapped in a hook

---

## Schema Translation

All 18 Dexie tables become SQL tables. Key patterns:

| Dexie | SQL |
|---|---|
| `++id` (auto-int) | `id TEXT PRIMARY KEY` (keep ULIDs) |
| `[a+b]` compound index | `CREATE INDEX ON table (a, b)` |
| `*tags` multi-entry index | Separate `tags` table or JSON column |
| Nested objects (e.g. `stats`) | JSON column (`TEXT` with JSON) |
| `date.year / date.season / date.day` | Flat columns per open-questions answer |

Notable tables: `realms`, `regions`, `factions`, `npcs`, `pois`, `paths`, `worldEvents`, `weatherHistory`, `factionRelationships`, `systemConfigs`, `monsters`, `spells`, `magicItems`, `equipment`, `dungeons`, `rooms`, `namingTables`, `realmNotes`

---

## Migration Phases

### Phase 1 — Local swap (Dexie out, PGlite in)
1. Add `@electric-sql/pglite` + `@electric-sql/pglite/live`
2. Remove `dexie`, `dexie-react-hooks`
3. Write `src/db/schema.sql` with all CREATE TABLE statements
4. Rewrite `src/db/db.ts` as PGlite init + schema bootstrap
5. Rewrite all repositories in `src/infrastructure/repositories/` to use SQL
6. Replace `useLiveQuery` calls with PGlite live query hooks
7. One-time migration script: export existing Dexie data as JSON → import into PGlite on first load (use existing `ExportRealm` as the basis)

### Phase 2 — Sync layer (Electric SQL)
1. Stand up a Postgres + Electric server (Docker Compose, self-hosted)
2. Add `electric-sql` client
3. Configure shape subscriptions per entity type
4. Conflicts: last-write-wins by `updatedAt` timestamp (add column to all tables)
5. Sync is transparent — repositories stay the same, Electric handles replication

---

## Data Migration Strategy

On first boot after upgrade:
1. Check if old Dexie database exists (`indexedDB.databases()`)
2. If yes: run one-time migration — dump all Dexie tables to JS objects, insert into PGlite via SQL
3. If no: fresh start
4. Flag in `localStorage` that migration is complete so it never runs again

The existing `ExportRealm.ts` / `ImportRealm.ts` can double as the migration source, since they already serialize all 13+ entity types.

---

## Open Questions Before Starting

1. **OPFS vs IndexedDB persistence for PGlite?** OPFS is faster and more reliable but has some Safari/iPad constraints. IndexedDB is the safe fallback. Rec: start with IndexedDB, test OPFS on iPad.
2. **Electric SQL self-host complexity?** Minimal — single Docker Compose file. But requires a machine to run it (home server, VPS). Confirm this is acceptable before Phase 2.
3. **Live query performance?** PGlite live queries re-run the full SQL on every write to watched tables. Should be fine for this data size but worth benchmarking with large realms.

---

## Packages

Remove:
- `dexie`
- `dexie-react-hooks`

Add:
- `@electric-sql/pglite`
- `@electric-sql/pglite/live` (bundled with pglite)
- `electric-sql` (Phase 2 only)
