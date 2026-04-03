# PGlite Migration Plan

## Overview

Swap Dexie (IndexedDB) for PGlite (SQLite in WASM) as the local storage layer.
No event sourcing, no workers, no materializers — just SQL reads and writes.
The domain and application layers are untouched. Only the infrastructure layer changes.

**Current DB:** Dexie v35, 22 tables, reading hooks for normalization
**Target DB:** PGlite, same 22 tables, same data shapes, SQL queries

---

## What Makes This Migration Safe

The repository pattern isolates all Dexie code to `src/infrastructure/dexie/`.
The domain and application layers only know about port interfaces (`INPCRepository`, etc.).
You can migrate one repository at a time, run the app, and verify before moving on.
Dexie stays in place until Phase 4 — no data loss risk during development.

---

## Tricky Cases to Handle Upfront

Before writing any SQL, resolve these — they affect the schema design.

### 1. Multi-entry indexes → JSON columns with PostgreSQL array operators

Dexie's `*factionIds` and `*tags` are multi-entry indexes that allow querying by a single value inside an array. In PGlite (PostgreSQL), these become JSONB columns queried with `@>`:

```sql
-- Dexie: db.npcs.where('factionIds').equals(factionId)
SELECT * FROM npcs WHERE factionIds::jsonb @> $1::jsonb
-- where $1 = JSON.stringify([factionId])

-- Dexie: db.npcs.where('tags').equals(tag)
SELECT * FROM npcs WHERE tags::jsonb @> $1::jsonb
```

### 2. Reading hooks → application-layer normalization

Dexie's `reading` hooks patch missing fields on POIs, NPCs, and Realms for records created before certain schema versions. In PGlite, handle this in a `normalize` utility called in each repository's read methods:

```ts
// src/infrastructure/pglite/normalize.ts
export function normalizePOI(row: RawPOI): POI { ... }
export function normalizeNPC(row: RawNPC): NPC { ... }
export function normalizeRealm(row: RawRealm): Realm { ... }
```

This replaces the hook behavior with explicit normalization at read time.

### 3. JSON columns

All nested objects (`systemBlock`, `locationSeed`, `spatialDungeon`, `watabouData`, `traps`, `treasure`, `services`, `sessionLog`, `wanderingMonsters`, `monsterRefs`, `agendaGoals`, etc.) are stored as `TEXT` (JSON string) and parsed in the repository layer. PGlite supports JSONB but TEXT + JSON.parse/stringify is simpler and avoids type friction.

### 4. Compound indexes

`[factionId+targetId]` on factionRelationships becomes a composite SQL index:
```sql
CREATE UNIQUE INDEX idx_faction_rel ON factionRelationships (factionId, targetId);
```
Query: `WHERE factionId = $1 AND targetId = $2`

---

## Phase 1 — Install PGlite, Create Schema

**Goal:** PGlite boots and schema is created. No UI changes yet.

### Tasks

1. Install package:
   ```bash
   pnpm add @electric-sql/pglite
   ```

2. Create `src/infrastructure/pglite/db.ts`:
   - Initialize PGlite with IndexedDB persistence (not OPFS — better Safari/iPad compat)
   - Run schema SQL on first boot
   - Export `db` instance

3. Create `src/infrastructure/pglite/schema.sql` with all 22 CREATE TABLE statements.
   All JSON fields as `TEXT`. All IDs as `TEXT PRIMARY KEY`. Indexes matching Dexie's.

4. Create `src/infrastructure/pglite/normalize.ts` with normalization functions for
   POI, NPC, and Realm (ported from the Dexie reading hooks).

### Schema notes

Key non-obvious columns (all others are TEXT or INTEGER as appropriate):

| Table | Column | Type | Notes |
|---|---|---|---|
| npcs | factionIds | TEXT | JSON array, replaces *factionIds multi-entry |
| npcs | tags | TEXT | JSON array, replaces *tags multi-entry |
| npcs | systemBlock | TEXT | JSON object |
| npcs | traits | TEXT | JSON array |
| pois | traps | TEXT | JSON array |
| pois | treasure | TEXT | JSON array |
| pois | services | TEXT | JSON array |
| pois | sessionLog | TEXT | JSON array |
| pois | wanderingMonsters | TEXT | JSON array |
| pois | monsterRefs | TEXT | JSON array |
| pois | magicItemRefs | TEXT | JSON array |
| pois | spellRefs | TEXT | JSON array |
| pois | equipmentRefs | TEXT | JSON array |
| pois | locationSeed | TEXT | JSON object or NULL |
| pois | spatialDungeon | TEXT | JSON object or NULL |
| pois | dungeonGenOptions | TEXT | JSON object or NULL |
| pois | watabouData | TEXT | JSON object or NULL |
| worlds | starredMonsterIds | TEXT | JSON array |
| worlds | starredSpellIds | TEXT | JSON array |
| worlds | starredMagicItemIds | TEXT | JSON array |
| worlds | customRaces | TEXT | JSON array |
| worlds | raceColors | TEXT | JSON object |
| factions | agendaGoals | TEXT | JSON array |
| factions | advantages | TEXT | JSON array |
| factions | obstacles | TEXT | JSON array |
| factions | traits | TEXT | JSON array |
| factions | agentNpcIds | TEXT | JSON array |
| factionRelationships | events | TEXT | JSON array |
| regions | features | TEXT | JSON array |
| regions | dangers | TEXT | JSON array |
| regions | settlements | TEXT | JSON array |
| regions | resources | TEXT | JSON array |
| regions | boundary | TEXT | JSON object or NULL |

### Done when
`pnpm dev` loads, PGlite initializes (check console), no errors.

---

## Phase 2 — Rewrite Repositories (One at a Time)

**Goal:** All 21 repositories rewritten to use PGlite SQL. Dexie repos deleted.

### Pattern for every repository

```ts
// Read — single
async getById(id: string): Promise<NPC | undefined> {
  const result = await db.query<RawNPC>('SELECT * FROM npcs WHERE id = $1', [id])
  return result.rows[0] ? normalizeNPC(deserializeNPC(result.rows[0])) : undefined
}

// Read — collection
async getByRealmId(worldId: string): Promise<NPC[]> {
  const result = await db.query<RawNPC>('SELECT * FROM npcs WHERE worldId = $1', [worldId])
  return result.rows.map(row => normalizeNPC(deserializeNPC(row)))
}

// Read — JSON array contains
async getByFactionId(factionId: string): Promise<NPC[]> {
  const result = await db.query<RawNPC>(
    'SELECT * FROM npcs WHERE factionIds::jsonb @> $1::jsonb',
    [JSON.stringify([factionId])]
  )
  return result.rows.map(row => normalizeNPC(deserializeNPC(row)))
}

// Write
async create(npc: NPC): Promise<void> {
  const s = serializeNPC(npc)
  await db.query(
    `INSERT INTO npcs (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET ...`,
    [s.id, s.worldId, ...]
  )
}

// Delete
async delete(id: string): Promise<void> {
  await db.query('DELETE FROM npcs WHERE id = $1', [id])
}
```

Each repository needs a `serialize` (entity → flat row with JSON strings) and `deserialize` (flat row → entity with parsed JSON) pair.

### Repository migration order (least to most complex)

1. `SystemConfigRepository` — simple, no JSON arrays
2. `RealmRepository` — 3 JSON array fields, reading hook normalization
3. `RegionRepository` — 4 JSON array fields + boundary
4. `WeatherRepository` — simple
5. `RollHistoryRepository` — simple
6. `WorldEventRepository` — simple
7. `RealmNoteRepository` — simple
8. `EntityNoteRepository` — simple
9. `GameMapRepository` — simple
10. `PathRepository` — compound index query
11. `FactionRelationshipRepository` — compound index query
12. `RumorRepository` — simple
13. `NoticeRepository` — simple
14. `EncounterTableRepository` — customSections JSON
15. `FactionPresenceRepository` — compound index query
16. `POIEventRepository` — compound index query
17. `TableRepository` — tags multi-entry index
18. `CustomCompendiumRepository` — monsterData/spellData/magicItemData JSON
19. `FactionRepository` — 5 JSON array fields
20. `NPCRepository` — factionIds + tags multi-entry, systemBlock JSON, normalization
21. `POIRepository` — largest: 10+ JSON array fields, normalization

### Done when
TypeScript compiles. All `import { db } from '@infrastructure/dexie/db'` removed from repos.

---

## Phase 3 — Rewrite Reactive Hooks

**Goal:** Replace all `useLiveQuery` calls with PGlite live queries.

PGlite live query pattern:
```ts
// Before (Dexie)
import { useLiveQuery } from 'dexie-react-hooks'
export function useNPCs(worldId: string | null) {
  return useLiveQuery(
    () => worldId ? db.npcs.where('worldId').equals(worldId).toArray() : [],
    [worldId]
  ) ?? []
}

// After (PGlite)
import { useLiveQuery } from '@infrastructure/pglite/useLiveQuery'
export function useNPCs(worldId: string | null) {
  return useLiveQuery<NPC[]>(
    () => worldId
      ? db.query<RawNPC>('SELECT * FROM npcs WHERE worldId = $1', [worldId])
          .then(r => r.rows.map(deserializeNPC))
      : Promise.resolve([]),
    [worldId],
    []
  )
}
```

Create `src/infrastructure/pglite/useLiveQuery.ts` — a React hook that:
- Runs the query on mount
- Subscribes to PGlite's live query system (`db.live.query`)
- Re-runs when deps change
- Returns a default value while loading

### Files to update
- `src/ui/hooks/` — 27 hooks
- Any routes or components with direct `useLiveQuery` calls

### Done when
Zero imports from `dexie-react-hooks` in the codebase.

---

## Phase 4 — Data Migration for Existing Worlds

**Goal:** Any existing Dexie data is seamlessly migrated into PGlite on first boot.

### Strategy

On app boot, before rendering:
1. Check `localStorage.getItem('rk-pglite-migrated')` — if `'true'`, skip
2. Check if Dexie database exists: `indexedDB.databases().then(dbs => dbs.some(d => d.name === 'RealmKeeperDB'))`
3. If Dexie DB exists:
   - Open it read-only
   - Dump all 22 tables to plain JS objects
   - Insert into PGlite in dependency order (see below)
   - Set `localStorage.setItem('rk-pglite-migrated', 'true')`
4. If no Dexie DB: just set the flag and continue

### Dependency order for insert

```
systemConfigs
→ worlds
  → regions
    → factions
      → factionRelationships
      → npcs
        → factionPresences
    → pois
      → paths
      → poiEvents
      → rumors
      → notices
      → encounterTables
      → gameMaps
  → realmNotes
  → worldEvents
  → weatherHistory
  → rollHistory
  → entityNotes
tableSets
tableDefs
customCompendiumEntries
```

### Implementation

Create `src/infrastructure/pglite/migrate-from-dexie.ts`:

```ts
export async function migrateFromDexie(pgliteDb: PGlite): Promise<void> {
  const alreadyMigrated = localStorage.getItem('rk-pglite-migrated') === 'true'
  if (alreadyMigrated) return

  const dbs = await indexedDB.databases()
  const hasDexie = dbs.some(d => d.name === 'RealmKeeperDB')
  if (!hasDexie) {
    localStorage.setItem('rk-pglite-migrated', 'true')
    return
  }

  // Open Dexie read-only and dump all tables
  const dexie = new Dexie('RealmKeeperDB')
  // ... open with current schema version
  // ... read all tables
  // ... insert into PGlite in dependency order
  // ... handle JSON serialization

  localStorage.setItem('rk-pglite-migrated', 'true')
  console.log('[PGlite migration] Complete')
}
```

### Safety notes

- Keep Dexie as a dev dependency until migration is confirmed working in production
- The migration is read-only on the Dexie side — no risk of corrupting existing data
- If migration fails partway through, the localStorage flag is NOT set, so it retries on next boot
- Run migration before the first PGlite query — in `db.ts` init, before exporting the db

---

## Phase 5 — Cleanup

1. Remove `dexie`, `dexie-react-hooks`, `dexie-cloud-addon` from `package.json`
2. Delete `src/infrastructure/dexie/` directory
3. Remove `VITE_DEXIE_CLOUD_URL` from `.env` and Vite config
4. Delete `src/components/layout/cloud-auth.tsx`
5. Remove Dexie cloud configure block
6. After one release confirmed stable in production: remove the migration script

---

## Estimated Scope

| Area | Files | Effort |
|---|---|---|
| Schema + db init | 3 new files | Low |
| Normalize utilities | 1 new file | Low |
| Repository rewrites | 21 files | Medium (mechanical) |
| useLiveQuery hook wrapper | 1 new file | Low |
| Hook/route/component updates | ~30 files | Medium (repetitive) |
| Data migration script | 1 new file | Medium |
| Cleanup | ~5 deletions | Low |

No changes to: domain entities, application use-cases, port interfaces, UI components, routes (beyond hook imports).

---

## Open Questions

1. **IndexedDB vs OPFS persistence?** Start with IndexedDB (`{ dataDir: 'idb://realm-keeper' }`). Test OPFS on iPad before switching — OPFS is faster but Safari support is newer.
2. **Migration UI?** Should the app show a "Migrating your data..." screen during first boot? Probably yes for large realms — the migration could take a few seconds.
3. **Rollback?** If a user reports data loss after migration, they can export a JSON backup from the old Dexie version before upgrading. Worth adding a prompt: "Before upgrading, export a backup" in the release notes.
