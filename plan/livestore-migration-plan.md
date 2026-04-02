# LiveStore Migration Plan

## Problem

Dexie Cloud sync is returning `403 Forbidden` on the `/sync` endpoint. Root cause: free tier 100MB storage limit exceeded by large world data. Dexie Cloud is the only sync option for Dexie — no escape hatch without paying their service.

## Decision

Replace Dexie + Dexie Cloud with **LiveStore + ElectricSQL**.

**Stack:**
- **LiveStore** — local SQLite + reactive queries (replaces Dexie + dexie-react-hooks)
- **ElectricSQL** — sync layer, self-hosted on Coolify
- **Postgres** — remote source of truth, self-hosted on Coolify
- **Cloudflare tunnel** — existing infrastructure, exposes services to laptop + iPad

**Why this stack:**
- No vendor lock-in — we own the sync infrastructure
- Zero ongoing cost (already running Coolify server)
- ElectricSQL is the most mature LiveStore sync backend
- Event-sourcing model aligns with WorldEvent architecture
- SQL queries are more expressive than Dexie's JS API

## Scope

**73 files touch Dexie:**

| Layer | Files | Notes |
|---|---|---|
| Dexie schema + seeds | 4 | Rewrite as LiveStore SQL tables + events |
| Repositories | 21 | Rewrite as LiveStore event commits + queries |
| React hooks (useLiveQuery) | 27 | Swap to LiveStore `useQuery` |
| Routes with direct Dexie | 14 | Swap to LiveStore `useQuery` |
| Components with direct Dexie | 4 | Swap to LiveStore `useQuery` |
| DI container | 1 | Rewire for LiveStore |
| Dexie Cloud auth UI | 1 | Delete |

**Unchanged:** Domain layer (entities, value objects), application layer (use-cases, ports).

## Phases

### Phase 1 — Coolify Infrastructure
- Deploy Postgres on Coolify
- Deploy ElectricSQL Docker container, point at Postgres
- Verify connection from laptop and iPad via Cloudflare tunnel

### Phase 2 — LiveStore Schema + Events
- Define 24 SQL tables mirroring current Dexie schema
- Define ~96 events (entity × CRUD operations)
- Wire `@livestore/sync-electric` provider with Coolify ElectricSQL URL
- Port seed data (system configs, Cairn + Shadowdark table sets)

### Phase 3 — Replace Repositories
- Rewrite all 21 repositories using LiveStore event commits and SQL queries
- Update DI container (`src/infrastructure/container.ts`)
- Delete `cloud-auth.tsx` Dexie Cloud component

### Phase 4 — Update Reactive Layer
- Replace all `useLiveQuery` calls with LiveStore `useQuery` across:
  - 27 hooks in `src/ui/hooks/`
  - 14 routes with direct Dexie imports
  - 4 components with direct Dexie imports

### Phase 5 — Data Migration + Validation
- Export existing IndexedDB data (existing JSON export feature)
- Write one-time import script to seed LiveStore from exported JSON
- Test bidirectional sync: laptop ↔ iPad
- Validate offline behavior (app works without Coolify connection)

## Key Conceptual Shift

Dexie uses direct CRUD:
```ts
await db.npcs.add(npc)
await db.npcs.where('worldId').equals(id).toArray()
```

LiveStore uses events + queries:
```ts
db.commit(events.npcCreated({ ...npc }))
useQuery(db.sql`SELECT * FROM npcs WHERE worldId = ${id}`)
```

Every write becomes an event type. This aligns well with the existing WorldEvent / GM-confirms-everything model.

## Risks

- **LiveStore is beta** — API may change between versions; pin versions and review changelogs before upgrading
- **Data migration** — existing world data must be exported and re-imported; test thoroughly before decommissioning Dexie
- **Offline fallback** — LiveStore stores locally in SQLite (OPFS); app still works if Coolify is unreachable, sync resumes when back online
- **~7-10 sessions of work** — significant effort, but the architecture (Clean Architecture / repository pattern) keeps the blast radius contained to infrastructure and UI layers

## Unresolved Questions

1. Do we need to support any offline-only mode permanently, or is "sync when available" sufficient?
2. Should we write the data migration script before or after Phase 4?
