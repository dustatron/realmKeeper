# Treasure-Leads / Discovery Web — Design (Spec B2)

**Date:** 2026-06-27
**Branch:** `feature/treasure-leads-web`
**Status:** Approved design, pending spec review
**Builds on:** B1 (world treasure seeding) — items now live on POIs (`treasure`),
NPCs (`systemBlock.inventory`), and faction HQ/leader; flagged `notable`/magic.
**Followed by:** B3 — encounter ↔ region/discovery integration (region-type +
region-monster encounter tables; omens that point at discovery locations). OUT OF
SCOPE here.

## Problem

The world is now seeded with discoverable treasure, magic items, and high-level
monsters (B1) — but players have no organic way to learn where anything is, and
the GM has no at-a-glance "what's here and where" view. Build the discovery
layer: rumors/notices/found-notes/NPC-knowledge that point at real items across
the map, faction quests to acquire world items, and location-aware GM views.

## Decisions (locked)

1. **Pointable find** = a `TreasureItem` (`notable || isMagic`) in any POI's
   treasure, OR an `InventoryItem` (`notable || compendiumKind==='magicItem'`) in
   any NPC's inventory, PLUS each landmark's `secret`.
2. **Item targets are uniform & id-based:** every item (POI- or NPC-held) is
   addressed by `{ itemId, containerType: 'poi'|'npc', containerId }`. Requires
   adding a stable `id` to `InventoryItem`.
3. **Lead sources (all four):** tavern rumors (at settlements), NPC knowledge
   (a `Rumor` whose `sourceNpcId` is the knower), found notes (a `Rumor` placed at
   another site, "torn map / dying letter" flavor), notice-board postings.
4. **Always-exact text:** the structured `Hook` holds the precise target (GM
   answer key); the player-facing text names the item AND its exact site/holder.
5. **Volume:** 1–2 leads per pointable find, each placed at a holder DIFFERENT
   from the target, capped per settlement.
6. **Each non-party faction seeks one world item** — a faction-origin `Hook`
   (contact = leader) + a `Notice` at the faction HQ, secret targeting an item
   held elsewhere.
7. **Location-aware GM views** (the UI half): the region "What's Here" panel and
   the lead "GM reveal" show each item/monster's **holder + location**, not just
   counts; add a "big monsters — where" section.
8. **Generation is a post-pass** that runs after every item exists (ruin/dungeon
   pre-gen + B1 seeding), reading committed POIs/NPCs.

## Constraints discovered

- `Hook`/`Rumor`/`Notice` triad exists; `buildHooks` runs INSIDE pure
  `generateWorld` and emits faction recovery/revenge hooks. B2 leads can't go
  through `buildHooks` (items don't exist yet there) — they need a post-pass.
- `HookSecret` = `{ kind, targetType: 'poi'|'npc'|'faction', targetId, detail }`
  — no `'item'`, no container ref.
- `Rumor` = `{ ..., poiId, regionId, text, source, isUsed, isQuestHook, hookId,
  tags }` — no `sourceNpcId`.
- `InventoryItem` has NO `id` (decision 2 adds it). `TreasureItem` already has `id`.
- `RumorList` renders at settlements + (in `GenericTemplate`) only when
  `poi.type === 'ruin'`. Must broaden to the POI types where leads land.
- Current max Dexie version is **38** → B2 uses **39**.

## Data model

```ts
// InventoryItem (src/domain/value-objects/SystemBlock.ts) gains:
id: string   // stable per-item id (mint on add; backfill existing)

// HookSecret (src/domain/entities/Hook.ts):
targetType: 'poi' | 'npc' | 'faction' | 'item'   // + 'item'
containerType?: 'poi' | 'npc'                     // for item targets
containerId?: string                              // the POI/NPC holding the item

// Rumor (src/domain/entities/Rumor.ts) gains:
sourceNpcId?: string | null   // the NPC who knows this lead
```

- **Item target** = `{ kind: 'hidden_item', targetType: 'item', targetId: itemId,
  containerType, containerId, detail }`. Landmark-secret target reuses
  `targetType: 'poi'`, `kind: 'truth'`.
- `InventoryItem.id`: minted on add in `NPCInventoryEditor` and in B1's
  `pushMagicToNpc`/`pushTreasureToNpc` (so seeded items are addressable). Existing
  NPC inventory items get ids via the Dexie v39 upgrade + the `db.npcs`
  read-hook (or a one-time backfill).
- **Dexie v39:** index `rumors.sourceNpcId`; upgrade backfills `Rumor.sourceNpcId`
  (null), `HookSecret` container fields (undefined ok), and `InventoryItem.id`
  for existing NPCs. Read-hooks default the new optional fields.

## Generation

New post-pass use-case `executeGenerateTreasureLeads` in
`src/application/use-cases/GenerateTreasureLeads.ts`, run in `GenerateWorld.ts`
AFTER the ruin/dungeon/landmark pre-gen passes (every item now exists). Split for
testability:

- **Pure** `planTreasureLeads(targets, sources, rng) → LeadPlan[]`
  (`src/domain/services/worldgen/treasureLeads.ts`):
  - `targets` = all pointable finds (collected by the use-case): each is
    `{ itemId, name, isMagic, containerType, containerId, regionId }`; plus
    landmark-secret targets `{ landmarkPoiId, secret, regionId }`.
  - `sources` = candidate placements: settlements (tavern rumor / notice),
    NPCs (knowledge), other sites (found note).
  - For each target: 1–2 `LeadPlan`s, each = `{ target, sourceKind:
    'tavern'|'npc'|'note'|'notice', placement: {poiId?|npcId?} }`, placement ≠
    the target's holder, per-settlement cap respected. Deterministic.
- The **use-case** resolves each `LeadPlan` → a `Hook` (exact structured target)
  + projection: a `Rumor` (tavern/npc/note, `sourceNpcId` set for npc-knowledge)
  or a `Notice` (board). Exact text names the item + its site/holder. Persists via
  `hookRepo`/`rumorRepo`/`noticeRepo` (or `db` if no repo) + sets `Rumor.hookId`.
- **Faction-seeks-item:** for each non-party faction, pick one pointable item
  held elsewhere (not at its own HQ/leader); emit a `Hook` (contact = leader,
  secret → that item) + a `Notice` at the faction HQ ("the {faction} seeks {item},
  last seen at {site}"). Optionally append a free-text `AgendaGoal`.

Deterministic (seeded child rng); ids minted in the impure use-case. Idempotent
on regen: clear prior generated leads/hooks for the realm first (or accept
additive — decide in plan; prefer clearing generated ones tagged from this pass).

## UI

**Leads:**
- `RumorList` rendering broadened beyond ruins — show it on the POI types where
  leads are placed (settlements already; add dungeons/landmarks/other via the
  `GenericTemplate` guard + the relevant templates).
- **NPC detail page:** a "Rumors they know" block — `rumors` where
  `sourceNpcId === npc.id`.
- **Notice board:** existing `NoticeBoard` (settlements).
- **GM reveal:** `RumorList`/`NoticeBoard` resolve the linked `Hook` and show a
  GM-only "Points to: *{item}* — at {holder/site}" line; `isUsed` retires a lead.

**Location-aware views (decision 7):**
- Extend the region "What's Here" panel (`RegionContentsPanel` /
  `summarizeRegionContents`) so each notable treasure & magic item lists its
  **holder + location** ("Sun Blade — Old Mill", "Ember Ring — Grik the goblin"),
  and add a **"Big monsters"** section listing high-level/guardian monsters with
  their POI ("Ogre — Broken Tower"). Resolve holder names from the POIs/NPCs in
  the region; resolve monster names via the compendium.
  - "Big monsters" = monster refs whose `monsterThreat` is in the region tier's
    upper band (reuse `monsterThreat`/tier bands from B1's `compendium-utils`).

## Testing

- Pure `planTreasureLeads` (fixed seed): deterministic; 1–2 leads per target;
  placement holder ≠ target holder; per-settlement cap; all four source kinds
  reachable across a populated input.
- Integration `executeGenerateTreasureLeads`: over a seeded world, produces
  `Hook`s with `targetType:'item'` + `containerType`/`containerId` (and `'poi'`
  for landmark secrets), `Rumor`s/`Notice`s linked by `hookId`; NPC-knowledge
  rumors carry `sourceNpcId`; each non-party faction gets a seeks-item hook with a
  target NOT at its own HQ/leader.
- Pure `summarizeRegionContents` extended: returns holder/location per highlight
  and a big-monsters list; existing counts preserved.
- Migration: existing rumors/hooks read back with new fields defaulted; existing
  NPC inventory items get ids.

## Out of scope

- Encounter integration (region-type/monster encounter tables; omens → locations)
  → **B3**.
- Auto-marking a lead fulfilled when its item is collected (GM toggles `isUsed`).
- Vague/triangulation lead text (always-exact chosen).
- Tuning lead-density knobs (fixed 1–2).
- Changing `buildHooks` (its faction recovery/revenge hooks stay).
