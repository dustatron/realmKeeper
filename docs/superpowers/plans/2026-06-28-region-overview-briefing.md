# Region Overview Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Make the region overview a complete, link-rich GM briefing: terrain shown, Key locations / Key NPCs / Common creatures sections (all linked), and "What's Here" as one unified data table with breadcrumb locations and compendium-detail links.

**Architecture:** Continuation of the region-view-overhaul branch. A pure `poiBreadcrumb` helper + a `compendiumHref` link resolver; `summarizeRegionContents` extended to carry `compendiumId` so items can link to their compendium page; `RegionContentsPanel` rebuilt as a unified `DataTable`; the overview tab gains terrain + three linked key-detail sections.

**Tech Stack:** TS strict, React 19, TanStack Router, Vitest, the shared `DataTable`.

## Global Constraints

- **pnpm only.** Focused test `pnpm test <path>`; build gate `pnpm build`. Run `pnpm build` BEFORE every commit.
- **Branch:** `feature/region-view-overhaul`. Never commit to `main`.
- TDD for pure helpers; UI tasks build-gated.
- **lucide `Map` shadows JS `Map` in `regions_.$regionId.tsx`** — use plain objects there. New standalone modules may use `Map` freely.
- Compendium detail routes: monster `/realms/compendium/monsters/$monsterId` `{monsterId}`; magic item `/realms/compendium/magic-items/$itemId` `{itemId}`; equipment `/realms/compendium/equipment/$equipmentId` `{equipmentId}`; spell `/realms/compendium/spells/$spellId` `{spellId}`. POI `/realms/pois/$poiId`; NPC `/realms/npcs/$npcId`.

---

### Task 1: `poiBreadcrumb` helper

**Files:** Create `src/components/regions/poiBreadcrumb.ts`; Test `src/components/regions/poiBreadcrumb.test.ts`.

**Interfaces:** `poiBreadcrumb(poiId: string | null | undefined, pois: POI[]): { id: string; name: string }[]` — ancestor chain root→leaf via `parentPoiId`; `[]` when missing; cycle-safe.

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from 'vitest'
import { poiBreadcrumb } from './poiBreadcrumb'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

describe('poiBreadcrumb', () => {
  it('walks parentPoiId root→leaf', () => {
    const town = buildPOI({ regionId: 'r', name: 'Riverton', type: 'settlement' })
    const mill = buildPOI({ regionId: 'r', name: 'Old Mill', type: 'building' }); mill.parentPoiId = town.id
    const cellar = buildPOI({ regionId: 'r', name: 'Cellar', type: 'interior' }); cellar.parentPoiId = mill.id
    expect(poiBreadcrumb(cellar.id, [town, mill, cellar]).map(c => c.name)).toEqual(['Riverton','Old Mill','Cellar'])
  })
  it('returns [] for missing/empty and is cycle-safe', () => {
    expect(poiBreadcrumb(null, [])).toEqual([])
    expect(poiBreadcrumb('nope', [])).toEqual([])
  })
})
```
- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement**
```ts
import type { POI } from '@domain/entities/POI'
export function poiBreadcrumb(poiId: string | null | undefined, pois: POI[]): { id: string; name: string }[] {
  if (!poiId) return []
  const byId = new Map(pois.map((p) => [p.id, p]))
  const chain: { id: string; name: string }[] = []
  const seen = new Set<string>()
  let cur = byId.get(poiId)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift({ id: cur.id, name: cur.name })
    cur = cur.parentPoiId ? byId.get(cur.parentPoiId) : undefined
  }
  return chain
}
```
- [ ] **Step 4: Run → passes** + `pnpm build`.
- [ ] **Step 5: Commit** — `feat: poiBreadcrumb helper`

---

### Task 2: `compendiumHref` resolver + carry `compendiumId` in contents

**Files:** Create `src/components/shared/compendiumHref.ts` + test; Modify `src/components/regions/regionContents.ts` + its test.

**Interfaces:**
- `compendiumHref(compendiumId: string | null | undefined): { to: string; params: Record<string,string> } | null` — resolves via `getCompendiumById(id).kind` to the matching compendium route; `null` when unresolved.
- `RegionTreasure`/`RegionMagicItem`/`RegionMonsterRow` gain `compendiumId: string | null`. Treasures/magic carry the item's `compendiumId` (POI treasure `t.compendiumId`, the `magicItemRefs` id, or NPC inventory `it.compendiumId`); monsters carry the monster ref id.

- [ ] **Step 1: Failing tests**
```ts
// compendiumHref.test.ts
import { describe, it, expect } from 'vitest'
import { compendiumHref } from './compendiumHref'
import { getMonstersBySystemId } from '@domain/data/compendium'
describe('compendiumHref', () => {
  it('resolves a monster id to the bestiary route', () => {
    const m = getMonstersBySystemId('system-cairn-2e')[0]
    expect(compendiumHref(m.id)).toEqual({ to: '/realms/compendium/monsters/$monsterId', params: { monsterId: m.id } })
  })
  it('returns null for unknown/empty', () => { expect(compendiumHref(null)).toBeNull(); expect(compendiumHref('nope')).toBeNull() })
})
```
Add to `regionContents.test.ts`: a POI monster ref → its `RegionMonsterRow.compendiumId` equals the ref id; a magic `magicItemRefs` entry → `RegionMagicItem.compendiumId` set.

- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement**
```ts
// compendiumHref.ts
import { getCompendiumById } from '@domain/data/compendium'
export function compendiumHref(compendiumId: string | null | undefined):
  { to: string; params: Record<string, string> } | null {
  if (!compendiumId) return null
  const e = getCompendiumById(compendiumId)
  if (!e) return null
  switch (e.kind) {
    case 'monster':   return { to: '/realms/compendium/monsters/$monsterId',   params: { monsterId: compendiumId } }
    case 'magicItem': return { to: '/realms/compendium/magic-items/$itemId',   params: { itemId: compendiumId } }
    case 'equipment': return { to: '/realms/compendium/equipment/$equipmentId', params: { equipmentId: compendiumId } }
    case 'spell':     return { to: '/realms/compendium/spells/$spellId',        params: { spellId: compendiumId } }
    default: return null
  }
}
```
In `regionContents.ts`: add `compendiumId: string | null` to the three row interfaces and populate — treasures `compendiumId: t.compendiumId ?? null` (NPC-held: `it.compendiumId ?? null`); magic from POI treasure `t.compendiumId ?? null`, from `magicItemRefs` the `ref.id`, from NPC inventory `it.compendiumId ?? null`; monsters `compendiumId: ref.id`.

- [ ] **Step 4: Run → passes** + `pnpm build` (RegionContentsPanel may need a trivial touch to keep compiling — Task 3 rebuilds it; keep build green).
- [ ] **Step 5: Commit** — `feat: compendiumHref + carry compendiumId in region contents`

---

### Task 3: "What's Here" as one unified DataTable

**Files:** Modify `src/components/regions/RegionContentsPanel.tsx`.

**Interfaces:** Consumes `summarizeRegionContents`, `poiBreadcrumb` (T1), `compendiumHref` (T2), `DataTable`.

- [ ] **Step 1:** Rebuild the panel into a single `DataTable`. Props add `pois` (already passed) — used for breadcrumbs. Flatten the three groups into one row type:
  `{ kind: 'Treasure'|'Magic'|'Monster'; name; compendiumId; poiId; npcId?; guardianNpcId?; detail: string; notable?; big?; collected? }`
  (Treasure detail = `value`; Monster detail = `×count`; Magic detail = ''.)
  Columns (sortable):
  - **Kind** — Badge; sortValue kind.
  - **Name** — when `compendiumHref(compendiumId)` resolves, a `<Link>` to it; else plain text. Strike-through + "looted" when `collected`.
  - **Location** — `poiBreadcrumb(poiId, pois)` rendered as linked crumbs joined by " › " (each a `<Link>` to `/realms/pois/$poiId`); for NPC-held items show an NPC `<Link>` instead; sortValue = last crumb name.
  - **Detail** — value/count text.
  - **Flags** — notable / guardian (NPC link) / big badges.
  - Keep the **notable-only default + "show mundane" toggle** (applies to Treasure rows; magic/monsters always shown).
  Return `null` only when all groups empty.

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green.
- [ ] **Step 3: Commit** — `feat: unified What's-Here data table with breadcrumb + compendium links`

---

### Task 4: Overview key-details sections (terrain + key locations/NPCs/creatures)

**Files:** Modify `src/routes/_app/realms/regions_.$regionId.tsx`; add a small `terrainLabel` (in `src/components/map/terrainColors.ts` or `regionContents.ts`).

**Interfaces:** Consumes `compendiumHref`, `summarizeRegionContents` (for creatures), region `pois`/`npcs`/`factions`.

- [ ] **Step 1:** In `<TabsContent value="overview">`:
  - **Terrain** — show `region.terrain` via a `terrainLabel(terrain)` helper (title-case; e.g. `mountains`→"Mountains") as a labeled line/badge next to the danger tier.
  - **Key locations** — notable POIs from `pois` where `type ∈ {settlement, dungeon, ruin, landmark, fortification}` (top-level), each a `<Link>` to `/realms/pois/$poiId`. Section hidden when none.
  - **Key NPCs** — region `npcs` that are faction leaders (`factions.some(f => f.leaderNpcId === n.id)`) OR `n.notable` if such a flag exists, else the first ~8 npcs; each `<Link>` to `/realms/npcs/$npcId`, leaders flagged. Hidden when none.
  - **Common creatures** — distinct monsters from `summarizeRegionContents(pois, npcs).monsters` deduped by `compendiumId`; each rendered via `compendiumHref` as a `<Link>` to the bestiary (fallback plain text). Hidden when none.
  Use plain objects (lucide `Map` shadow). Place these above/around the existing `RegionContentsPanel`.
  - `terrainLabel`: `export const terrainLabel = (t: string) => t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Unknown'` (or split-words if needed).

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green. Manual: overview shows terrain + the three linked sections; creatures link to bestiary; locations/NPCs link to detail pages.
- [ ] **Step 3: Commit** — `feat: region overview key-details sections (terrain, key locations/NPCs/creatures)`

---

### Task 5: Verification
- [ ] `pnpm test` all pass; `pnpm build` clean.
- [ ] Manual smoke: What's-Here is a sortable table with breadcrumb locations + compendium links; overview shows terrain + key locations/NPCs/creatures, all linked.
- [ ] `git commit -m "test: region overview briefing green" --allow-empty`

---

## Self-Review
- Breadcrumb → T1; compendium links + compendiumId → T2; unified table → T3; terrain + key sections → T4. ✓
- Types: `poiBreadcrumb` (T1) + `compendiumHref` (T2) used in T3/T4; `compendiumId` on contents rows (T2) used in T3/T4.
- lucide `Map` shadow respected in the route (T4) and panel imports (T3 is a separate file — safe).
- Follow-ups: terrain vocab still split (biome vs TERRAIN_TYPES) — display-tolerant only; `n.notable` may not exist (fallback to first-N).
