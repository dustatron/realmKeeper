# Resource-Driven Worldgen — Phase 1: Terrain Foundation — Implementation Plan

> **For agentic workers:** implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task ends with a build/test gate and a conventional commit.

**Goal:** Make raw resources the source of truth for terrain. Ship the resource **catalog + theme packs**, the `resourcesToBiomes()` derivation, a **full elevation field**, **river geometry + chokepoints**, accurate `Region.resources`/`definingResource`, resource-themed region naming, and the **create-realm form** (resource multiselect, live biome preview, pack toggles, unclaimed/doom/ley-line selectors). Terrain — elevation + biomes + rivers — is built **once** here; later phases build on it, never redo it.

**Spec:** `docs/superpowers/specs/2026-06-30-resource-driven-worldgen-design.md` (Phase 1 of 6).

**Architecture:** Existing clean/hexagonal layering. Worldgen stays **pure, staged, deterministic** (`SeededRandom`). New derivations are pure functions with unit tests. The create-realm biome preview calls the **same** `resourcesToBiomes()` used by generation, so preview == result. Resource catalog + packs live in the **table registry** (`TableProvider`/`ResolvedTables`) so users can extend them. The generation config (chosen resources, packs, toggles, doom, ley-lines) threads through `executeGenerateWorld` opts → `generateWorld` opts; selectors that feed later phases (doom selector, ley-lines, unclaimed) are **stored/plumbed now, activated later**.

**Tech stack:** TypeScript (strict), Vite/TanStack Start, Dexie 4 (current version **41**), Vitest, ULID, `SeededRandom` (mulberry32), Tailwind + Radix UI (`Switch`, `ToggleGroup`, `Select`, existing `components/ui`).

## Global constraints

- **Branch:** `feature/resource-worldgen-p1-terrain` off `main`. Never commit to `main`.
- **pnpm only.** `pnpm build` = `vite build && tsc --noEmit`; `pnpm test` = vitest.
- **`worldId`, never `realmId`.**
- **Dexie:** current version **41**. Add exactly one new `db.version(42)` with backfill; never edit a released `version()` block. Additive only (pattern: `migrations/v36-defaults`, `v37-town-defaults`).
- **IDs:** `newId()` (ULID). Timestamps: `Date.now()` for `createdAt`/`updatedAt`.
- **Determinism:** new picks use **child rngs** (`rng.child('…')`) where inserted mid-pipeline so existing seeded output stays byte-identical where possible. Where stage order changes (biome from elevation), accept a new-but-deterministic output and update affected snapshot/golden tests.
- **Tables stay system-agnostic; voice = "grounded + light whimsy"; all text original.**
- **Commit** after each task (`feat:`, `test:`, `chore:`).

## File structure

**Created:**
- `src/domain/data/worldgen/resources.catalog.ts` — resource catalog entries + theme-pack tags + `resourcesToBiomes()` derivation. Pure.
- `src/domain/data/worldgen/resources.catalog.test.ts`
- `src/domain/data/worldgen/resourcePacks.ts` — pack enum (`low-fantasy | high-fantasy | sci-fi | doomed`), default-on set, size→resource-count scaling, auto-propose (seeded, biome-spread).
- `src/domain/data/worldgen/resourcePacks.test.ts`
- `src/lib/hexmap/elevation.ts` — pure elevation field (noise / distance-from-coast) + biome-from-elevation refinement.
- `src/lib/hexmap/elevation.test.ts`
- `src/lib/hexmap/rivers.ts` — pure river tracing (downhill from highland sources) + chokepoint detection (fords/passes/bridges).
- `src/lib/hexmap/rivers.test.ts`
- `src/domain/services/worldgen/resourceBiome.ts` — region defining-resource selection (weighted for biome variety) → biome.
- `src/domain/services/worldgen/resourceBiome.test.ts`
- `src/infrastructure/dexie/migrations/v42-resource-defaults.ts` + `.test.ts` — backfill `Region.definingResource = null`.
- `src/ui/components/realm/ResourceMultiselect.tsx` — tag-like editable resource picker.
- `src/ui/components/realm/BiomePreview.tsx` — live biome distribution from selected resources.

**Modified:**
- `src/domain/entities/Region.ts` — add `definingResource: string | null`; keep `resources: string[]`.
- `src/domain/entities/GameMap.ts` — add optional cell fields `elevation?: number`, `river?: boolean`, `chokepoint?: 'ford' | 'pass' | 'bridge' | null` (additive; older maps fall back).
- `src/domain/services/worldgen/generateWorld.ts` — new pipeline stages: defining-resource → elevation → biome → rivers/chokepoints; populate region resources; thread config opts.
- `src/domain/services/worldgen/regionFlavor.ts` — resource-aware region naming + resource list from real resources.
- `src/application/use-cases/GenerateWorld.ts` — extend input with `resources`, `packs`, `unclaimedDeposits`, `doom`, `leyLines`.
- `src/infrastructure/dexie/db.ts` — add `db.version(42)`.
- `src/routes/_app/realms/new.tsx` — resource multiselect + biome preview + pack toggles + unclaimed toggle + doom **selector** (replace `genLoomingThreat` boolean) + ley-lines toggle; pass through to `executeGenerateWorld`.

## Tasks

### 1. Resource catalog + packs (data, pure)
- [ ] `resources.catalog.ts`: `ResourceDef { name; packs: Pack[]; tier: 'raw' | 'finished'; biome: Biome | null; rarityWeight: number; lore: string; cultureArchetype: string }`. Author the Standard/Low-Fantasy raw set per biome (mountains/hills/forest/grasslands/desert/jungle/marsh/frozen + **blighted dark high-value**), High-Fantasy, Sci-Fi, Doomed packs, and the derived finished-goods list (biome `null`).
- [ ] `resourcePacks.ts`: pack list (High-Fantasy default-on), `resourceCountForSize(size)`, `autoProposeResources(packs, size, rng)` — seeded, weighted to spread biomes.
- [ ] Tests: every raw resource maps to a valid `Biome`; finished goods have `biome: null`; auto-propose is deterministic + biome-varied; blighted resources exist per pack.
- [ ] **Gate:** `pnpm test` green. Commit `feat(worldgen): resource catalog + theme packs`.

### 2. `resourcesToBiomes()` derivation
- [ ] In `resources.catalog.ts`: pure `resourcesToBiomes(resources: string[]): Record<Biome, number>` (counts per biome from raw resources; ignores finished). This is the **shared** fn the form preview and generation both call.
- [ ] Tests: known resource sets → expected biome distribution; finished goods contribute nothing; empty → empty.
- [ ] **Gate + commit** `feat(worldgen): resourcesToBiomes derivation`.

### 3. Elevation field (pure)
- [ ] `elevation.ts`: deterministic elevation per hex (seeded noise or distance-from-coast/highland blend), `0..1`. `biomeFromElevation(elevation, definingResource)` refines placement (high→mountains/hills, low→marsh/coast, rain-shadow→desert).
- [ ] Tests: deterministic for a seed; elevation monotonic from highland→coast; biome refinement respects the resource's implied biome.
- [ ] **Gate + commit** `feat(hexmap): elevation field`.

### 4. Rivers + chokepoints (pure)
- [ ] `rivers.ts`: trace rivers from highland sources downhill to lake/coast/edge over the elevation field; mark river cells; detect chokepoints (river crossing = ford/bridge; low-elevation gap between highs = pass).
- [ ] Tests: rivers always flow non-increasing in elevation and terminate at water/edge; no orphan river cells; chokepoints sit on river/elevation features; deterministic per seed.
- [ ] **Gate + commit** `feat(hexmap): river tracing + chokepoints`.

### 5. Region defining-resource → biome (service)
- [ ] `resourceBiome.ts`: from the config resource pool, assign each region a `definingResource` (weighted to preserve biome variety) → region biome via the catalog. Pure, seeded.
- [ ] Tests: distribution stays varied across regions; biome matches the defining resource's catalog biome.
- [ ] **Gate + commit** `feat(worldgen): region defining-resource selection`.

### 6. Entity + migration
- [ ] `Region.ts`: add `definingResource: string | null`. `GameMap.ts`: add optional cell `elevation`/`river`/`chokepoint`.
- [ ] `v42-resource-defaults.ts`: backfill `definingResource = null` on existing regions. `db.ts`: `db.version(42)`.
- [ ] Tests: migration backfills; db opens at v42; round-trips.
- [ ] **Gate + commit** `feat(db): v42 region definingResource + map elevation fields`.

### 7. Wire generateWorld pipeline
- [ ] Thread new opts (`resources`, `packs`, `unclaimedDeposits`, `doom`, `leyLines`) through `GenerateWorld.ts` → `generateWorld.ts` (store the later-phase ones on the realm/config; consume `resources`/`packs` now).
- [ ] Replace biome-center selection: pick defining resource (Task 5) → biome; compute elevation (Task 3); assign cell biomes via `biomeFromElevation`; trace rivers/chokepoints (Task 4) onto cells.
- [ ] Populate `Region.definingResource` + `Region.resources` (defining + any scattered) and resource-themed names (`regionFlavor.ts`).
- [ ] Update affected golden/snapshot tests (output changes deterministically).
- [ ] **Gate:** `pnpm build` + `pnpm test`. Commit `feat(worldgen): resource-driven biomes, elevation, rivers in pipeline`.

### 8. Create-realm form
- [ ] `ResourceMultiselect.tsx`: tag-like, editable; seeded auto-propose on size/pack change; add/remove individual resources (incl. cross-pack).
- [ ] `BiomePreview.tsx`: render `resourcesToBiomes(selected)` live (e.g. `🏔 ×3 · 🌲 ×2 · ☠ ×1`).
- [ ] `new.tsx`: add pack toggles (High-Fantasy default), multiselect + preview, **unclaimed-deposit toggle** (default on for large), **doom selector** replacing `genLoomingThreat` boolean (options filtered by enabled packs; Random/None), **ley-lines toggle** (default on). Pass all to `executeGenerateWorld`.
- [ ] Manual check: generating with a chosen set yields matching biomes; preview matches result.
- [ ] **Gate:** `pnpm build`. Commit `feat(ui): resource selection + biome preview in create-realm`.

### 9. Phase acceptance
- [ ] Generating with a chosen resource set produces matching biomes; elevation yields realistic placement; rivers flow downhill to water/edge; chokepoints exist as data; biome preview == generated world; `Region.resources`/`definingResource` reflect real resources.
- [ ] `pnpm build` + `pnpm test` green. Open PR.

## Notes / risks

- **Determinism churn:** moving biome assignment onto elevation will change generated output vs. today. That's expected — update golden tests once, in Task 7, and keep everything seeded.
- **Selectors-without-features:** doom selector, ley-lines, unclaimed toggle ship in the form now but only fully activate in P2/P5/P6. Store their values on the realm config; today's one-shot `buildDoom` keeps running until P6 (doom selector can map to it as a label).
- **No POI.trade yet** — `trade`/deposits/natural-sites/wealth are Phase 2+. Phase 1 is terrain + form only.
