# World Treasure Seeding — Design (Spec B1)

**Date:** 2026-06-27
**Branch:** `feature/treasure-leads-web`
**Status:** Approved design, pending spec review
**Part of:** the discovery vision — magic items & treasures scattered across the
world with rumors/hooks pointing at them. This spec (B1) seeds the *holders*.
**Followed by:** Spec B2 — *Discovery / leads web* (hooks/rumors/notices pointing
at any holder; includes "every faction seeks a specific world item").

## Problem

Magic items and treasures only exist as ruin/dungeon loot today. The world has no
treasure on settlements, NPCs, or factions — nothing for players to stumble onto
while wandering, and nothing for the future leads web (B2) to point at outside a
dungeon. Seed discoverable treasure across the living world.

## Decisions (locked)

1. **Holders:** non-ruin/dungeon **POIs** (settlements + minor POIs) and **any
   NPC** (named *and* creatures, weighted). Factions hold treasure only via the
   **no-schema HQ/leader model** (an item placed at the faction's HQ POI or on
   its leader NPC) — NOT a new `Faction.treasure` field.
2. **Every non-party faction is guaranteed one "great" find** — a notable magic
   item (or notable treasure if magic is off) placed at its HQ POI (preferred) or
   leader NPC, flagged `notable`. Party faction excluded.
3. **Per-region distribution:** every region gets discoverable items + treasure,
   scaled by region tier (tougher biomes → richer).
4. **Two density controls** in the create-realm form: independent **magic-item
   density** and **treasure density**, each `off | sparse | moderate | frequent`
   (default `moderate`). `off` seeds none of that kind.
5. **System-aware:** magic items pulled from the active system's compendium
   (Cairn `system-cairn-2e` and Shadowdark `system-shadowdark`).
6. **B2 seam:** a "pointable find" = any held item where `notable === true` OR it
   is magic (`TreasureItem.isMagic` / `InventoryItem.compendiumKind === 'magicItem'`).
   B1 guarantees ≥1 notable find per region (when any density > off) and one per
   non-party faction.

## Constraints discovered

- **POIs** already hold `treasure: TreasureItem[]`; **NPCs** hold items via
  `systemBlock.inventory: InventoryItem[]` (edited by `NPCInventoryEditor`).
  **Factions** have no item field (hence the HQ/leader model). No new UI needed —
  both holder views already render their items.
- `InventoryItem` (`src/domain/value-objects/SystemBlock.ts`) =
  `{ name, slots, description, quantity?, value?, source?, compendiumId?,
  compendiumKind?, compendiumSource? }` — no `notable` flag yet.
- `TreasureItem` already has `notable?` and `isMagic?` (added by the ruin work).
- `pickMagicItem(systemId, rng)` (`~/lib/worldgen/compendium-utils`) →
  `{ id, name, description } | null`, system-aware with a generic fallback.
  `generateTreasureItems(level, count, rng)` (`~/lib/worldgen/treasure-gen`) →
  `TreasureItem[]` (mundane coin/gems/valuables).
- Existing density pattern: `PoiDensity = 'sparse'|'normal'|'dense'` with a
  `DENSITY: Record<…, number>` multiplier (`generateWorld.ts:40-42`). Mirror this.
- Region tier: `biomeTier(biome)` → `'easy'|'tough'|'perilous'`
  (`regionFlavor.ts`, exported by the ruin work).
- POIs/NPCs/regions/factions are all built in the **pure** `generateWorld()`
  phase, before persistence — the natural place to seed (ruin/dungeon loot is a
  separate post-transaction pass and is untouched here).

## Data model

Only one additive change:

```ts
// InventoryItem gains (mirrors TreasureItem.notable):
notable?: boolean
```

No other entity changes. Seeded items land in:
- **POI holder** → `poi.treasure` as `TreasureItem` (`isMagic`/`notable` set as appropriate).
- **NPC holder** → `npc.systemBlock.inventory` as `InventoryItem`
  (`source: 'treasure'` for mundane, `source: 'compendium'` +
  `compendiumKind: 'magicItem'` + `compendiumId` for magic; `notable` for great finds).
- **Faction** → the faction's HQ POI treasure (preferred) or leader NPC inventory,
  using the holder shapes above. No tag needed: B2 derives faction ownership from
  `faction.headquartersPoiId` / the leader's `factionIds`.

Persistence: seeded POIs/NPCs are written by the existing world-gen bulk writes
(`db.pois.bulkPut` / `db.npcs.bulkPut`) — no new tables. `InventoryItem.notable`
is an additive optional, so no Dexie migration is required (existing rows read
back `undefined`, treated as not-notable).

## Config (create-realm form)

Add to `GenerateWorldInput` (`src/application/use-cases/GenerateWorld.ts`):

```ts
worldMagicDensity?: LootDensity     // default 'moderate'
worldTreasureDensity?: LootDensity  // default 'moderate'
```

```ts
export type LootDensity = 'off' | 'sparse' | 'moderate' | 'frequent'
const LOOT_DENSITY: Record<LootDensity, number> = {
  off: 0, sparse: 0.5, moderate: 1, frequent: 2,
}
```

Two `Select`s in `src/routes/_app/realms/new.tsx` (mirroring the existing
`poiDensity` Select), threaded through `executeGenerateWorld` into
`generateWorld()` opts and on into `seedWorldTreasure`.

## Generation

New pure module `src/domain/services/worldgen/seedTreasure.ts`:

```ts
export function seedWorldTreasure(
  input: {
    regions: Region[]
    pois: POI[]            // mutated in place (or returned updated)
    npcs: NPC[]            // mutated in place (or returned updated)
    factions: Faction[]
    systemId: string
    magicDensity: LootDensity
    treasureDensity: LootDensity
  },
  rng: SeededRandom,
): void   // decorates poi.treasure and npc.systemBlock.inventory
```

Algorithm:
1. **Eligible holders.** POIs: exclude `type === 'dungeon' | 'ruin'` and any POI
   whose parent is a dungeon (room children). NPCs: all, but selected by weight so
   most carry nothing.
2. **Per region** (group POIs by `regionId`, NPCs by `npc.regionId`): compute a
   tier factor from `biomeTier(region.terrain)` (`easy 1, tough 1.5, perilous 2`).
   - `treasureCount = round(baseTreasure × LOOT_DENSITY[treasureDensity] × tier)`
     mundane treasures, scattered across the region's eligible POIs/NPCs
     (`generateTreasureItems` with a tier-scaled level; on NPCs converted to
     `InventoryItem`).
   - `magicCount = round(baseMagic × LOOT_DENSITY[magicDensity] × tier)` magic
     items (`pickMagicItem`), placed on a few eligible holders.
   - **Guarantee:** if `magicDensity !== 'off' || treasureDensity !== 'off'`, the
     region gets **≥1 `notable` find** (a magic item if magic on, else a notable
     treasure).
3. **Faction great items.** For each non-party faction, place one **notable great
   item** (magic if `magicDensity !== 'off'`, else a notable treasure) at its HQ
   POI treasure (if `headquartersPoiId` set) or on its leader NPC inventory (if
   `leaderNpcId` set). This guarantee is independent of region budgets — every
   non-party faction always gets exactly one. (If a faction has neither HQ nor
   leader, skip it and log.)
4. All randomness via the passed `SeededRandom`; flags (`notable`, `isMagic` /
   `compendiumKind`) set so B2 can find pointable items.

Base constants (`baseTreasure`, `baseMagic`) are tuned in the plan; defaults aim
for "moderate→frequent" feel: every region has several mundane treasures and a
notable find, magic rarer than treasure.

### Where it runs

Inside the pure `generateWorld()` (`src/domain/services/worldgen/generateWorld.ts`),
after POIs, NPCs, regions, and factions are built and before the return — same
phase as `buildHooks`. Threaded a `systemId` + the two densities via opts.
Determinism preserved (single seeded `rng` stream; call `seedWorldTreasure` at a
fixed point in the sequence).

## Determinism

`seedWorldTreasure` is pure and deterministic for a given seed + inputs. It mints
no entity ids except `TreasureItem.id` via `newId()` (consistent with existing
`generateTreasureItems`, which already does so in the worldgen layer). Same seed +
same densities → same placement.

## Testing

- Unit (`seedTreasure.test.ts`, fixed seed):
  - Deterministic (`toEqual` across two runs).
  - `off`/`off` → no items seeded anywhere; faction guarantee still places a
    notable treasure for each non-party faction (the "MUST have a great item"
    rule overrides density, defaulting to treasure when magic is off).
  - Every region gets ≥1 notable find when any density > off.
  - Density scales counts (`frequent` > `moderate` > `sparse`).
  - Region tier scales (`perilous` region gets more/richer than `easy`).
  - Ruin/dungeon POIs and dungeon-room children never receive seeded items.
  - Each non-party faction gets exactly one notable great item at HQ or leader;
    party faction gets none.
  - Magic resolves for BOTH `system-cairn-2e` and `system-shadowdark`.
  - Magic items carry `isMagic`/`compendiumKind:'magicItem'`; the pointable-find
    seam (`notable || magic`) holds.
- Integration: a generated world (via `executeGenerateWorld`) has seeded treasure
  on non-dungeon POIs and some NPCs, and a great item per faction; dungeon/ruin
  loot is unchanged.
- Migration: NPCs predating `InventoryItem.notable` read back fine (undefined).

## Out of scope (this spec)

- The leads/hooks web → **B2** (rumors/notices/found-notes/NPC-knowledge pointing
  at holders; `HookSecret.targetType:'item'` + `containerPoiId`; `Rumor.sourceNpcId`).
- **Every faction seeks a specific world item** → **B2** (needs the complete world
  item set — ruin/dungeon loot + B1 seeding — and is itself a faction-origin hook;
  may attach to a faction `AgendaGoal` + a `Hook`).
- A `Faction.treasure` schema field (deliberately avoided; HQ/leader model used).
- Rebalancing existing dungeon/ruin loot.
- New UI (existing `TreasureSection` + `NPCInventoryEditor`/inventory views render
  seeded items).

## B2 inputs (recorded, not built here)

- Pointable find = held item with `notable === true` OR magic.
- Faction ownership derivable from `headquartersPoiId` / leader `factionIds`.
- B2 must add: `HookSecret.targetType:'item'` + `containerPoiId`,
  `Rumor.sourceNpcId`; generate "faction seeks item X held at Y" hooks; scatter
  tavern/NPC/found-note/notice leads (always-exact text), 1–2 per pointable item,
  placed at a holder different from the target, capped per settlement.
