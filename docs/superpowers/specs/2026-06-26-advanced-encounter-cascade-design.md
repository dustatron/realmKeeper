# Advanced Encounter Cascade — Design

**Date:** 2026-06-26
**Status:** Approved (brainstorm); pending spec review → implementation plan

## Summary

Two related encounter features for the dungeon/POI view, modeled on
[Hexbinder](https://hexbinder.vercel.app):

1. **Advanced Encounters tab** — a cascading random-table experience. Roll a
   master table (the POI/region's editable encounter categories) → roll the hit
   category's entries → enrich `npc`/`creature` results with a reaction roll and
   a generated NPC card / matched monster stat block. Per-table re-roll and
   re-roll-all. The assembled result persists on the encounter table.

2. **Simple 1d6 encounter check** — a small button on the Rooms tab next to the
   wandering-monster Roll. Rolls `1dN` (configurable "1 in N" chance); on a `1`,
   auto-runs the existing wandering-monster roll. Independent of feature 1.

These are **separate** features: the simple check is the fast, in-play trigger;
the Encounters tab is the rich generator.

## Goals / Non-goals

**Goals**
- Reuse the existing GM-editable `EncounterTable` (no migration of category data).
- Reuse existing generators: `executeGenerateNPC`, `rollDisposition`, compendium
  monster lookup, `MonsterStatBlock`.
- Persist the rolled result so it survives reloads and session boundaries.
- Promote a generated NPC into a real, linked `NPC` entity.
- Work across **all templates** that use the encounter table (Dungeon,
  Settlement, Generic, Building, and the region route).

**Non-goals (v1)**
- Sensory "first impressions" (sight/sound/smell). Deferred.
- Terrain/biome-driven table variation. Dungeons have no terrain; per-POI
  editable tables already let the GM tailor content.
- Hexbinder's seed-only persistence model. We store the assembled result object.
- Structured/weighted entries (entries stay plain editable strings).

---

## Feature 1 — Advanced Encounters tab

### Data model

Reaction uses the existing `Disposition` type
(`src/shared/constants.ts`): `'hostile' | 'wary' | 'curious' | 'kind' | 'helpful'`.

New value-object `EncounterRollResult` (the assembled outcome):

```ts
interface EncounterRollResult {
  masterRoll: number              // 1..N over active categories
  category: string                // hit category key, or custom section id
  categoryLabel: string
  entryIndex: number
  entryText: string               // rolled line from that category
  reaction?: Disposition          // npc/creature only
  reactionRoll?: number           // 2d6 total that produced `reaction`
  npc?: NPC                        // generated, not-yet-saved (full entity)
  npcSavedId?: string | null       // set once promoted to a real NPC
  monsterMatch?: { compendiumId: string; name: string } | null  // creature auto-match
  rolledAt: number
}
```

**Persistence:** add `lastResult: EncounterRollResult | null` to the
`EncounterTable` entity (`src/domain/entities/EncounterTable.ts`). The table row
already carries `ownerPoiId` / `ownerRegionId` / `worldId`, so a single field
covers POI- and region-scoped tables uniformly. Writes go through the existing
`UpdateEncounterTable` use case + `EncounterTableRepository` (Dexie
`encounterTables`). No new Dexie store or schema index needed (the field is
non-indexed JSON).

### Cascade engine

New use case `RollEncounterCascade` (`src/application/use-cases/`), composed from
existing parts. Deps: `{ encounterTableRepo, tableRepo, compendiumRepo }`
(tableRepo for NPC name generation; compendiumRepo for monster match).

Steps:

1. **Master roll** — reuse `getActiveSections(table)` from `RollEncounter` to get
   the ordered active categories (non-disabled categories with entries, falling
   back to `DEFAULT_ENCOUNTER_ENTRIES`, plus custom sections). Roll
   `1d{sections.length}` (crypto `rollDice`) → picked category.
2. **Entry roll** — roll `1d{entries.length}` over the picked category's entries
   → `entryText`, `entryIndex`.
3. **Enrich by category:**
   - `npc` → roll reaction via `rollDisposition()` (2d6); generate a full NPC via
     `executeGenerateNPC` (needs the owner's `systemConfig` + `worldId`/`regionId`).
     `entryText` is shown as the encounter premise; the NPC is the card.
   - `creature` → roll reaction; auto-match `entryText` to a compendium monster
     (same name lookup the wandering-monster table uses, via
     `wanderingMonsterUtils`/compendium search). Match → `monsterMatch` populated
     for a stat card; no match → text + reaction only.
   - all others (`signOmen`, `loss`, `discovery`, `treasure`, custom) →
     `entryText` only.

Result is written to `table.lastResult` and returned.

**Reaction ranges for the UI:** extract the 2d6→`Disposition` range mapping that
backs `rollDisposition` into a shared `REACTION_RANGES` constant
(e.g. `{ min, max, disposition }[]`) so the Reaction sub-table can render rows
("2–6: Hostile", …) and highlight the hit. `rollDisposition` should use the same
constant to avoid duplication.

### Re-roll semantics

We persist the assembled result (not a seed), so each re-roll recomputes the
affected part and overwrites `table.lastResult`:

- **Re-roll All** — fresh master → entry → enrichment.
- **Re-roll Master** — new category, then re-roll its entry + enrichment (the
  category changed, so downstream must change too).
- **Re-roll Entry** — same category; new entry line + fresh enrichment (new
  monster match / NPC premise). Reaction is preserved unless separately re-rolled.
- **Re-roll Reaction** — re-roll the 2d6 disposition only.
- **Re-roll NPC** — regenerate the NPC; keep category + reaction.

Each handler is a thin function over the engine that updates and persists the
relevant slice.

### UI

New component `EncounterCascade.tsx` (`src/components/shared/`) replaces
`EncounterTableUI` as the encounter tab's main view, with a **mode toggle**:

- **Roll mode (default)** — the cascade experience (below).
- **Edit tables mode** — renders the existing `EncounterTableUI` editor, so no
  editing capability is lost. GM edits category entries here.

Roll mode layout (top → bottom, mirroring Hexbinder):

1. **Result banner** — assembled summary (e.g. "Goblin scouts — wary"),
   **Re-roll All** button, "last rolled" timestamp. Empty state: a single
   "Roll an encounter" button.
2. **Master Table card** — active categories listed; hit row highlighted with
   `←`; per-table re-roll icon.
3. **Category entries sub-table** — the hit category's entries; rolled row
   highlighted; re-roll icon.
4. **Reaction sub-table** (npc/creature only) — `REACTION_RANGES` rows; hit
   highlighted; re-roll icon.
5. **Result card:**
   - `npc` → NPC card (reuse the Denizens NPC display component) + **Save as NPC**.
   - `creature` → `MonsterStatBlock` (reused from the wandering-monster table)
     when `monsterMatch` is set, else the entry text; reaction tag shown.
   - others → a flavor text card.

Row highlight follows Hexbinder's pattern: compare row index to `entryIndex`, and
for reaction compare against the matched range.

The tab is wired the same way for every template that currently renders
`EncounterTableUI` (Dungeon/Settlement/Generic/Building + region route) by
swapping in `EncounterCascade` and passing the loaded `EncounterTable` plus the
owner context (`systemConfig`, `worldId`, `regionId`, and `poiId` where present)
needed for NPC generation and Save-as-NPC.

### Save as NPC

On the generated NPC card, **Save as NPC**:
- Sets `npc.poiId = <owner POI id>` (the field the Denizens tab keys on,
  `npcsByPoiId[npc.poiId]`) and persists via `executeCreateNPC(npc, { npcRepo })`.
- Records the new id in `lastResult.npcSavedId`; button flips to "Saved ✓" and is
  disabled to prevent duplicates.
- **v1 scope:** Save-as-NPC is shown only on POI-scoped tables (where a `poiId`
  exists). On region-scoped tables (region route) the button is hidden; the
  generated NPC card still displays but isn't promotable in v1.

---

## Feature 2 — Simple 1d6 encounter check (Rooms tab)

Small, independent.

- **Data:** add `encounterChance: number | null` to `POI`
  (`src/domain/entities/POI.ts`); `null` ⇒ default `6`. Set defaults in the POI
  constructors (`buildPoi.ts`, `GenerateDungeon.ts`, `GenerateRegion.ts`, the
  Dexie seed builder, and `devApi` import mapping) — `tsc --noEmit` will flag any
  missed constructor.
- **UI:** in `WanderingMonsterTable.tsx` header, beside the existing **Roll**:
  - an editable **"1 in N"** number input bound to `encounterChance`
    (persisted via a new `onSaveEncounterChance` prop → `db.pois.update`);
  - an **Encounter Check** button: rolls `1d{N}`; on a `1`, auto-runs the existing
    `handleRoll` (wandering-monster slot-machine); otherwise shows transient
    "Rolled X — no encounter" text (no persistence).
- Clamp N to a sane range (e.g. 2–20). Feature is enabled only when the
  `onSaveEncounterChance` prop is provided (dungeon Rooms tab).

---

## Reuse map (existing code)

| Need | Existing |
|---|---|
| Active category resolution | `getActiveSections` (`RollEncounter.ts`) |
| Dice | `rollDice` (`src/shared/dice.ts`) |
| Reaction (2d6) | `rollDisposition` (`src/shared/dice.ts`) |
| NPC generation (stats, wants) | `executeGenerateNPC` (`GenerateNPC.ts`) |
| Create/link NPC | `executeCreateNPC` (`CreateNPC.ts`), `NPC.poiId` |
| Monster name match + stat card | `wanderingMonsterUtils`, `MonsterStatBlock` |
| Encounter table persistence | `EncounterTable`, `UpdateEncounterTable`, `EncounterTableRepository` |
| Existing editor | `EncounterTableUI` (kept as "Edit tables" mode) |

## Edge cases

- **No entries / all categories disabled** — master roll has no sections; banner
  shows an empty/disabled state prompting the GM to add entries (Edit tables mode).
- **NPC generation needs a `SystemConfig`** — if the owner's system config is
  unavailable, fall back to a text-only `npc` result (no card) rather than error.
- **Creature name has no compendium match** — text + reaction only.
- **Re-roll while an NPC is already saved** — re-rolling clears the unsaved NPC;
  an already-saved NPC entity is untouched (it lives independently in Denizens).
- **Custom sections** — treated as categories with no enrichment (text only).

## Testing

- Unit-test the cascade engine: master/entry selection over active sections;
  enrichment branches (npc/creature/other); each re-roll function updates only its
  slice. Inject `rollDice` for determinism.
- Unit-test `REACTION_RANGES` ↔ `rollDisposition` agreement.
- Unit-test Save-as-NPC sets `poiId` and writes `npcSavedId`.
- Simple check: `1dN` triggers wandering roll only on `1`; transient text otherwise.

## Out of scope / future

- Sensory first-impressions section (sight/sound/smell) per roll.
- Terrain/theme table variation.
- Weighted/structured entries and `subTableId` deep cascades (the `TableDef`
  engine already supports `subTableId` if we later want it).
</content>
</invoke>
