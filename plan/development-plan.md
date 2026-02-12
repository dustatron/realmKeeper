# Realm Keeper — Development Plan

## Context

Greenfield local-first PWA for tabletop RPG GMs. No code exists yet. Combines Clean Architecture/DDD patterns (adapted for client-only) with the MVP build order from `plan/realm-keeper-plan-v4.docx`. All data IndexedDB via Dexie.js, zero backend.

---

## Resolved Decisions

- **Days per season:** 30 default, per-realm configurable
- **Seasons:** 4 hardcoded (Spring/Summer/Fall/Winter)
- **Night watch:** single watch (3 watches/day: Morning, Afternoon, Night)
- **Dark mode:** dark default + light/dark toggle
- **NPC names:** auto-gen from naming tables; user can swap/add naming tables
- **Cairn data source:** parse from [yochaigal/cairn](https://github.com/yochaigal/cairn) repo markdown (~42 tables, ~1400 entries). Key files: `second-edition/wardens-guide/setting-seeds.md`, `npc-tables.md`, `naming-procedures.md`, `wilderness-exploration.md`, `players-guide/character-creation.md`, `players-guide/marketplace.md`, `backgrounds/*.md`
- **WorldDate storage:** store `{ year, season, day }` as indexable fields; `watch` as separate field. No dotted-path compound index issue.
- **crypto.getRandomValues:** test on iPad Safari early in Phase 0

---

## Architecture

Adapted Clean Architecture — dependencies flow inward, domain layer is pure TS with zero framework deps.

```
src/
├── domain/           # Pure TS: entities, value objects, domain services, events
├── application/      # Use cases + port interfaces (IFactionRepository, etc.)
├── infrastructure/   # Dexie repos, event bus, export/import adapters
├── ui/               # React components, hooks, Zustand stores, TanStack routes
└── shared/           # ULID, dice roller, constants
```

**Key rules:**
- Domain layer: ZERO React/Dexie/framework imports
- Repositories = Dexie adapters implementing port interfaces
- Zustand for UI state ONLY (selected realm, modals, filters)
- Domain events for audit log + cross-cutting UI sync
- GM confirmation pattern: use cases emit suggestions → UI collects confirmation → separate commit use case persists

---

## Phase 0: Foundation (MVP Steps 1-3)

### 0.1 Project Scaffold [L]
- `package.json` — deps: `@tanstack/react-start@^1.154.0`, `react@^19`, `dexie@^4`, `dexie-react-hooks`, `zustand`, `react-markdown`, `remark-gfm`, `ulid`, `tailwindcss`, `@radix-ui/react-*`, `vite-plugin-pwa`
- `vite.config.ts` — TanStack Start plugin, SPA mode, PWA plugin, NO Cloudflare
- `tsconfig.json` — strict, path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@ui/*`, `@shared/*`
- `tailwind.config.ts` — iPad-first, dark mode class strategy, dark default
- `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/router.tsx`

**Verify:** `npm run dev` serves blank page, `npm run build` succeeds, PWA installable in dev tools

### 0.2 Shared Utilities [S]
- `src/shared/ulid.ts` — `newId()` wrapper
- `src/shared/dice.ts` — `rollDice("3d6")`, `rollDice("4d6kh3")`, `rollDice("d100")` using `crypto.getRandomValues`
- `src/shared/constants.ts` — seasons, watch names (`morning | afternoon | night`), relationship scale labels, default days per season (30)
- `src/shared/markdown.ts` — shared renderer config

### 0.3 Domain Entities + Value Objects [M]
All pure TypeScript, zero framework deps:

| File                                        | Key Types                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/entities/SystemConfig.ts`           | `SystemConfig`, `StatFieldDef`                                                                                                                                |
| `domain/entities/Realm.ts`                  | `Realm` (includes `daysPerSeason: number` default 30)                                                                                                         |
| `domain/entities/Region.ts`                 | `Region`                                                                                                                                                      |
| `domain/entities/Faction.ts`                | `Faction`, `AgendaGoal`, `Advantage`                                                                                                                          |
| `domain/entities/NPC.ts`                    | `NPC` with embedded `SystemBlock`                                                                                                                             |
| `domain/entities/FactionRelationship.ts`    | `FactionRelationship`, `RelationshipEvent`                                                                                                                    |
| `domain/entities/WorldEvent.ts`             | `WorldEvent`                                                                                                                                                  |
| `domain/entities/WeatherHistory.ts`         | `WeatherHistory`                                                                                                                                              |
| `domain/entities/RealmNote.ts`              | `RealmNote`                                                                                                                                                   |
| `domain/entities/POI.ts`                    | `POI`                                                                                                                                                         |
| `domain/entities/Path.ts`                   | `Path`                                                                                                                                                        |
| `domain/entities/TableDef.ts`               | `TableDef`, `TableSet`, `TableEntry`                                                                                                                          |
| `domain/entities/RollHistory.ts`            | `RollHistory`                                                                                                                                                 |
| `domain/value-objects/WorldDate.ts`         | `WorldDate { year, season, day }` + `watch` separate. `advanceWatch()`, `advanceDay()`, `advanceWeek()`. Uses realm's `daysPerSeason` for season transitions. |
| `domain/value-objects/RelationshipScore.ts` | Clamped -6..+6, `deriveStatus()`                                                                                                                              |
| `domain/value-objects/SystemBlock.ts`       | `SystemBlock`, `Attack`, `InventoryItem`, `NpcConnection`                                                                                                     |

### 0.4 Port Interfaces [S]
One interface per aggregate root in `src/application/ports/`:
- `IRealmRepository`, `IRegionRepository`, `IFactionRepository`, `INPCRepository`
- `IFactionRelationshipRepository`, `ITableRepository`, `IWorldEventRepository`
- `IWeatherRepository`, `IRealmNoteRepository`, `IPOIRepository`, `IPathRepository`
- `IRollHistoryRepository`, `IEventBus`

### 0.5 Dexie Schema + Seed Data [L]

**Schema** — `watch` stored as separate field, date fields flat for indexing:
```typescript
db.version(1).stores({
  systemConfigs: 'id',
  realms: 'id, systemId',
  regions: 'id, realmId',
  factions: 'id, realmId, status, isParty',
  npcs: 'id, realmId, factionId, regionId, *tags',
  npcConnections: 'id, npcId, targetNpcId',
  factionRelationships: 'id, factionId, targetId, [factionId+targetId]',
  pois: 'id, regionId, type',
  paths: 'id, regionId, [fromPoiId+toPoiId]',
  realmNotes: 'id, realmId, isMain, sortOrder',
  worldEvents: 'id, realmId, [year+season+day]',
  weatherHistory: 'id, realmId, [year+season+day]',
  tableSets: 'id, source, systemId',
  tableDefs: 'id, setId, *tags, systemId',
  rollHistory: 'id, realmId, tableId, timestamp',
})
```

- `src/infrastructure/dexie/db.ts` — schema above
- `src/infrastructure/dexie/repositories/` — one per port (13 repos)
- `src/infrastructure/dexie/seed.ts` — `db.on('populate')` inserts SystemConfigs + table sets
- `src/infrastructure/dexie/seed-tables-cairn.ts` — parsed from Cairn repo markdown
- `src/infrastructure/dexie/seed-tables-shadowdark.ts` — Shadowdark table data
- `src/infrastructure/event-bus/EventBus.ts` — in-memory pub/sub

**Cairn data extraction:** Write a script (`scripts/parse-cairn-tables.ts`) that fetches markdown from `yochaigal/cairn` via `gh api`, regex-parses pipe tables, outputs typed TS seed files. Priority tables for MVP:
1. NPC naming (3 d20 tables from `npc-tables.md`)
2. Character traits (8 d10 tables from `character-creation.md`)
3. Faction types/traits/advantages/agendas/actions (~5 tables from `setting-seeds.md`)
4. Settlement/POI/terrain types (~12 tables from `setting-seeds.md`)
5. Weather tables (seasonal + unusual from `wilderness-exploration.md`)
6. Naming procedures (d100 adjectives + nouns from `naming-procedures.md`)
7. Weapons/armor/gear (~7 sections from `marketplace.md`)

Backgrounds (20 individual files in `backgrounds/*.md`) deferred to post-MVP due to parsing complexity.

### 0.6 DI Container [S]
- `src/infrastructure/container.ts` — plain TS object, singleton repos + event bus
- `src/ui/hooks/useContainer.ts` — React context provider

---

## Phase 1: Core Domain Logic (MVP Steps 2, 4)

### 1.1 SystemConfig Service [S]
- `domain/services/SystemConfigService.ts` — `getStatLabels()`, `buildDefaultSystemBlock()`
- Cairn: STR/DEX/WIL, 3d6 each, HP "Hit Protection" 1d6, Armor 0-3, no level/class
- Shadowdark: STR/DEX/CON/INT/WIS/CHA, 3d6 (derive modifier), HP class die + CON mod, AC 10+armor+DEX, has level + class

### 1.2 Random Table Engine [M]
- `domain/services/RandomTableEngine.ts` — `rollOnTable(tableDef, diceRoller): TableResult`
- `domain/services/TableChainRunner.ts` — runs ordered table sequences (NPC gen chains, naming chains)
- `domain/events/TableRolled.ts`

### 1.3 Table Engine Use Cases [S]
- `application/use-cases/RollOnTable.ts`, `RunTableChain.ts`, `SearchTables.ts`

### 1.4 Weather Engine [S]
- `domain/services/WeatherEngine.ts` — 6x4 season table, "extreme twice = catastrophic"

### 1.5 Clock Engine [M]
- `domain/services/ClockEngine.ts` — `advanceWatch()`, `advanceDay()`, `advanceWeek()` with trigger lists
- Season transitions at `realm.daysPerSeason` (default 30)
- 3 watches/day: morning → afternoon → night → next day morning
- `domain/events/ClockAdvanced.ts`

### 1.6 Faction Turn Engine [L]
- `domain/services/FactionTurnEngine.ts` — d6 roll, opposition check, WIL save via agent NPC stats
- `domain/services/RelationshipCascade.ts` — cascading relationship shifts
- `domain/events/FactionTurnRolled.ts`, `FactionTurnConfirmed.ts`

**Pattern:** Engine returns `FactionTurnSuggestion[]` (NOT persisted). UI shows to GM. Separate `ConfirmFactionTurn` use case commits.

---

## Phase 2: Core CRUD + NPC System (MVP Steps 5-6)

### 2.1 Zustand Store [S]
- `ui/stores/uiStore.ts` — `activeRealmId`, `sidebarOpen`, `modalStack`, `activeFilters`, `darkMode` (persisted, default true)

### 2.2 Shared UI Components [M]
- `MarkdownField.tsx` — view/edit toggle, react-markdown + remark-gfm
- `ConfirmDialog.tsx`, `FilterBar.tsx`, `DiceButton.tsx`, `EmptyState.tsx`, `TagInput.tsx`, `Card.tsx`, `PageHeader.tsx`
- `ThemeToggle.tsx` — dark/light toggle
- `RootLayout.tsx` — top nav + realm selector + theme toggle
- `RealmLayout.tsx` — sidebar nav (Dashboard, Factions, NPCs, Regions, Tables, Notes, POIs, Calendar)

### 2.3 Realm/Region CRUD [M]
- Use cases: `CreateRealm` (auto-creates party faction + main note, sets `daysPerSeason: 30`), `UpdateRealm` (incl. daysPerSeason), `DeleteRealm` (cascade), `CreateRegion` (manual + gen), `UpdateRegion`, `DeleteRegion`
- Hooks: `useRealms`, `useRegions`, `useActiveRealm`
- Routes: `realms/index`, `realms/$realmId`, `realms/$realmId/regions/*`

### 2.4 NPC System [L]
- Use cases: `CreateNPC`, `GenerateNPC` (runs npcGenChain + naming table, returns for review), `UpdateNPC`, `DeleteNPC`, `LinkNPCToFaction`, `AddNPCConnection`
- NPC generation auto-rolls name from naming tables; user can re-roll or type custom
- SystemConfig gets `namingTables: string[]` field — user can swap/add naming table refs per realm
- Components: `NPCList` (filterable), `NPCDetail` (two-zone: universal + SystemBlock), `SystemBlockView/Edit`, `NPCGenerateDialog`, `ConnectionsList`
- Routes: `realms/$realmId/npcs/*`

**Verify:** Generate Cairn NPC (STR/DEX/WIL, no level/class, auto-name) vs Shadowdark NPC (6 stats + mods, level, class, auto-name). Edit all fields. Filter/search.

---

## Phase 3: Faction System (MVP Steps 7-10)

### 3.1 Faction Manager [L]
- Use cases: `CreateFaction`, `GenerateFaction` (rolls type/traits/advantages/agenda + generates 1-3 agent NPCs), `UpdateFaction`, `DeleteFaction`
- Components: `FactionList`, `FactionDetail`, `FactionGenerateWizard`, `AgendaGoalList`
- Routes: `realms/$realmId/factions/*`

### 3.2 Faction Relationships [M]
- Use cases: `InitializeRelationships` (bidirectional, score 0 with all existing), `UpdateRelationship` (both directions atomically), `GetRelationshipMatrix`
- Components: `RelationshipMatrix` (grid, color-coded), `RelationshipHistory`

### 3.3 Party Faction [S]
- Auto-created with realm. `isParty: true`. Never auto-rolls.
- `PartyView` — member list, relationships with all factions

### 3.4 Faction Turns UI [L]
- Use cases: `ExecuteFactionTurns` (all active non-party), `ConfirmFactionTurn`
- Components: `FactionTurnDialog` (full-screen, per-faction results, GM edits before confirm), `TurnResultCard`

---

## Phase 4: Calendar + Timeline (MVP Steps 11-12)

### 4.1 Calendar System [L]
- Use cases: `AdvanceClock` (by watch/day/week, triggers weather + faction check), `GetTimeline`
- Components: `ClockDisplay`, `AdvanceControls`, `WeatherDisplay`, `Timeline`, `AdvanceConfirmDialog`
- Route: `realms/$realmId/calendar`

### 4.2 Faction Turn Triggers [S]
- Realm setting: `factionTurnTrigger` = `day` | `week` | `manual`
- `AdvanceClock` checks trigger config, includes faction results in confirmation if triggered
- `TriggerConfig` component

---

## Phase 5: Content + Polish (MVP Steps 13-17)

**5.1-5.5 can be built in parallel:**

### 5.1 Realm Notes [M]
- CRUD use cases, search across content
- `NotesSidebar` (main pinned, sub-pages reorderable), `NoteEditor` (Markdown split pane/toggle)

### 5.2 Dashboard [M]
- `ClockWidget`, `FactionSummary`, `RecentEvents`, `QuickActions`

### 5.3 POI + Path [M]
- `CreatePOI` (manual + gen), `CreatePath`, `CalculateTravelTime` (base + terrain + weather)

### 5.4 Table Browser UI [M]
- `TableBrowser`, `TableView`, `RollResultDisplay` (animated), `RollHistoryView`, `CustomTableEditor`

### 5.5 Export/Import [M]
- `ExportRealm` (full JSON incl. SystemConfig), `ImportRealm` (validate + ULID remap)
- `ExportTableSet`, `ImportTableSet`

### 5.6 PWA Polish [M] — do last
- Full manifest (icons, screenshots for iPad), service worker precache
- `InstallPrompt`, `UpdatePrompt` components
- Lighthouse PWA audit pass

---

## Key Architectural Decisions

1. **Live queries:** Hooks call `useLiveQuery` directly for reads; repos handle writes via use cases
2. **Forms:** Local React state (no form library for MVP)
3. **Event timing:** Events fire AFTER persistence succeeds
4. **Relationships:** Two records per pair (A→B and B→A, same score)
5. **NPC generation review:** `GenerateNPC` returns unpersisted NPC → UI review → `CreateNPC` persists on confirm
6. **Table data format:** Typed TS objects in source. Export format is JSON
7. **WorldDate storage:** `{ year, season, day }` as flat indexed fields; `watch` separate field
8. **Naming tables:** part of SystemConfig, user can swap/add per realm

---

## Dependency Graph

```
0.1 Scaffold → 0.2 Utils → 0.3 Entities → 0.4 Ports → 0.5 Dexie → 0.6 Container
                                                            |
                                              ┌─────────────┼──────────────┐
                                              v             v              v
                                         1.1 SysConfig  1.2 TableEngine  2.1 Zustand
                                              |             |              |
                                              v             v              v
                                    1.4 Weather → 1.5 Clock           2.2 Shared UI
                                                    |                      |
                                                    v                      v
                                              1.6 FactionTurn    2.3 Realm/Region → 2.4 NPC
                                                    |
                                                    v
                                    3.1 Factions → 3.2 Relationships → 3.3 Party → 3.4 Turns UI
                                                                                        |
                                                                                        v
                                                                            4.1 Calendar → 4.2 Triggers
                                                                                        |
                                                            ┌───────┬───────┬───────┬───┘
                                                            v       v       v       v
                                                         5.1     5.2     5.3    5.4/5.5
                                                                                    |
                                                                                    v
                                                                                  5.6 PWA
```

---

## Verification Strategy

| Phase | How to verify                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | `npm run dev` serves page, `npm run build` succeeds, Dexie DB opens with seeded data, PWA installable                                                |
| 1     | Unit tests: dice roller, table engine, weather engine, clock engine (season transition at day 30), faction turn engine (d6 distribution + WIL save)  |
| 2     | Manual: create realm, create region, generate NPC (Cairn + Shadowdark), edit fields, filter NPC list, verify Markdown rendering                      |
| 3     | Manual: generate faction + agents, relationship matrix displays, party excluded from turns, faction turn dialog shows/edits/confirms suggestions     |
| 4     | Manual: advance clock through watches → day → week, weather rolls on day boundary, faction turns trigger per config, timeline logs all events        |
| 5     | Manual: realm notes CRUD + search, dashboard shows live data, POI travel calc, table browser + roll, export JSON → reimport produces identical realm |
