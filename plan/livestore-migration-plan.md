# LiveStore Migration Plan

## Problem

Dexie Cloud sync returns `403 Forbidden` on `/sync`. Root cause: free tier 100MB storage limit exceeded. Dexie Cloud is the only sync option for Dexie — no escape hatch without paying their service.

## Decision

Replace Dexie + Dexie Cloud with **LiveStore + ElectricSQL**.

**Stack:**
- **LiveStore** — local SQLite (OPFS) + reactive queries (replaces Dexie + dexie-react-hooks)
- **ElectricSQL** — self-hosted sync layer on Coolify
- **Postgres** — remote source of truth on Coolify
- **Cloudflare tunnel** — existing infra, exposes ElectricSQL to laptop + iPad

**Why:**
- No vendor lock-in, zero ongoing cost
- Full offline writes (writes locally, syncs when online)
- SQL queries more expressive than Dexie's JS API
- Event-sourcing model aligns with WorldEvent / GM-confirms-everything architecture
- ElectricSQL is the most mature LiveStore sync backend

## Scope

73 files touch Dexie. Domain and application layers are untouched.

| Layer | Files | Change |
|---|---|---|
| Dexie schema + seeds | 4 | Rewrite as LiveStore SQL tables + events |
| Repositories | 21 | Rewrite using LiveStore events + SQL queries |
| React hooks (`useLiveQuery`) | 27 | Swap to LiveStore `useQuery` |
| Routes with direct Dexie | 14 | Swap to LiveStore `useQuery` |
| Components with direct Dexie | 4 | Swap to LiveStore `useQuery` |
| DI container | 1 | Rewire for LiveStore |
| Dexie Cloud auth UI | 1 | Delete |

---

## Phase 1 — Coolify Infrastructure

**Goal:** Sync backend running and reachable from both devices before writing any app code.

### Tasks

- [ ] Deploy Postgres on Coolify (native service)
- [ ] Deploy ElectricSQL via Docker (`electricsql/electric` image)
  - Set `DATABASE_URL` env var pointing at Postgres
  - Expose port 3000
- [ ] Add Cloudflare tunnel route for ElectricSQL (e.g. `electric.yourdomain.com`)
- [ ] Verify HTTP endpoint responds from laptop browser
- [ ] Verify HTTP endpoint responds from iPad browser
- [ ] Save ElectricSQL URL to `.env.local` as `VITE_ELECTRIC_URL`

### Done when
Both devices can reach `https://electric.yourdomain.com/health` and return `{"status":"ok"}`.

---

## Phase 2 — LiveStore Schema + Events

**Goal:** LiveStore wired up locally with full schema, syncing to ElectricSQL. No UI changes yet.

### Tasks

- [ ] Install packages
  ```bash
  pnpm add @livestore/livestore @livestore/wa-sqlite @livestore/react
  pnpm add @livestore/sync-electric
  ```
- [ ] Create `src/infrastructure/livestore/schema.ts`
  - Define 24 SQL tables (see table list below)
  - Mirror Dexie schema column-for-column
- [ ] Create `src/infrastructure/livestore/events.ts`
  - Define events for all 24 entities × CRUD (~96 events total)
  - Pattern: `entityCreated`, `entityUpdated`, `entityDeleted`
- [ ] Create `src/infrastructure/livestore/store.ts`
  - Instantiate LiveStore with ElectricSQL sync provider
  - Use `VITE_ELECTRIC_URL` env var
  - Export typed `useStore`, `useQuery` hooks
- [ ] Create `src/infrastructure/livestore/seed.ts`
  - Port system config seed data (Cairn 2e + Shadowdark)
  - Port table sets (Cairn + Shadowdark random tables)
  - Run seed on fresh store via `store.on('ready')`

### Tables to define

```
systemConfigs, worlds, regions, factions, npcs,
factionRelationships, pois, paths, realmNotes,
worldEvents, weatherHistory, tableSets, tableDefs,
rollHistory, factionPresences, poiEvents, gameMaps,
rumors, notices, encounterTables, entityNotes,
customCompendiumEntries
```

### Done when
App boots, LiveStore initialises, seed data appears in SQLite, ElectricSQL dashboard shows sync activity.

---

## Phase 3 — Replace Repositories

**Goal:** All data writes go through LiveStore events. Dexie repos deleted.

### Tasks

- [ ] Create `src/infrastructure/livestore/repositories/` directory
- [ ] Rewrite each of the 21 repositories
  - Reads: `store.query(sql\`SELECT ...\`)`
  - Writes: `store.commit(events.entityCreated({ ... }))`
  - Keep same method signatures as current port interfaces
- [ ] Update `src/infrastructure/container.ts`
  - Replace Dexie repo instantiation with LiveStore repo instantiation
  - Remove Dexie db import
- [ ] Delete `src/infrastructure/dexie/` directory
- [ ] Delete `src/components/layout/cloud-auth.tsx`
- [ ] Remove Dexie packages
  ```bash
  pnpm remove dexie dexie-react-hooks
  ```

### Repositories to rewrite (21)

```
RealmRepository, RegionRepository, FactionRepository,
NPCRepository, FactionRelationshipRepository,
POIRepository, PathRepository, RealmNoteRepository,
WorldEventRepository, WeatherRepository, TableRepository,
RollHistoryRepository, FactionPresenceRepository,
POIEventRepository, GameMapRepository, RumorRepository,
NoticeRepository, EncounterTableRepository,
EntityNoteRepository, SystemConfigRepository,
CustomCompendiumRepository
```

### Done when
TypeScript compiles. App boots. CRUD operations work via browser devtools inspection of SQLite.

---

## Phase 4 — Update Reactive Layer

**Goal:** All UI reactivity runs through LiveStore `useQuery`. No `useLiveQuery` remaining.

### Tasks

- [ ] Replace `useLiveQuery` in all 27 hooks (`src/ui/hooks/`)
  - `useLiveQuery(() => db.table.where(...))` → `useQuery(sql\`SELECT ...\`)`
- [ ] Replace direct Dexie imports in 14 routes
- [ ] Replace direct Dexie imports in 4 components
  - `CompendiumRefsSection.tsx`
  - `MonsterSearchTab.tsx`
  - `DungeonTemplate.tsx`
  - `cloud-auth.tsx` (already deleted in Phase 3)
- [ ] Fix `src/application/use-cases/DeleteGameMap.ts` (direct `db` import)
- [ ] Fix `src/infrastructure/dev/devApi.ts`
- [ ] Verify no remaining `dexie` imports: `grep -r "from 'dexie'" src/`

### Done when
Zero Dexie imports in codebase. All UI updates reactively on data changes.

---

## Phase 5 — Data Migration + Validation

**Goal:** Existing world data preserved. Sync verified across devices.

### Tasks

- [ ] Export current world data using existing JSON export feature
- [ ] Write one-time migration script `scripts/migrate-from-dexie.ts`
  - Reads exported JSON
  - Commits LiveStore events for each entity in dependency order:
    `systemConfigs → worlds → regions → factions → npcs → pois → ...`
- [ ] Run migration on laptop, verify data in app
- [ ] Open app on iPad, verify sync completes
- [ ] Make an edit on iPad, verify it appears on laptop
- [ ] Make an edit on laptop, verify it appears on iPad
- [ ] Kill network connection, make edits, restore connection, verify sync catches up
- [ ] Delete migration script after successful validation

### Done when
All world data intact on both devices. Bidirectional sync confirmed. Offline edits sync on reconnect.

---

## Key Conceptual Shift

**Dexie** — direct CRUD:
```ts
await db.npcs.add(npc)
await db.npcs.where('worldId').equals(id).toArray()
```

**LiveStore** — events + SQL queries:
```ts
store.commit(events.npcCreated({ ...npc }))
useQuery(sql`SELECT * FROM npcs WHERE worldId = ${worldId}`)
```

Every write becomes a named event. Events are the source of truth; SQL tables are derived read models.

---

## Risks

| Risk | Mitigation |
|---|---|
| LiveStore is beta | Pin exact version, review changelog before upgrading |
| Data loss during migration | Keep Dexie in place until Phase 5 fully validated |
| ElectricSQL infra goes down | App works offline; sync resumes on reconnect |
| Breaking API changes in LiveStore | Migration is fully isolated to infrastructure layer |

---

## Open Questions

1. Offline-only mode: is "sync when available, work always" sufficient, or do we need a hard offline mode toggle?
2. Data migration order: write migration script in Phase 5 or alongside Phase 2 schema work?
