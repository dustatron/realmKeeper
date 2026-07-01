# Settlement Description Redesign — Design Spec

> **Status:** Approved design (2026-06-30). Implementation deferred to a dedicated branch AFTER Phase 6 Doom (Task D) merges — this changes `buildSettlement.ts` output and the worldgen golden snapshot, which Task D also re-baselines. Do not start on the doom branch.
> **Author:** Design conversation, 2026-06-30.

## Problem

Every settlement's `description` is a fixed 6-slot clause chain welded into one paragraph (`buildSettlement.ts:83-88`): `<patron intro> + " Known for X; <quirk>. Its heart is <district>." + " Home to <guild>." + " Notably, <feature>." + " A local tradition: <festival>" + "\n\nGM secret: <secret>"`. It reads as a run-on pile of random draws, and a GM-only secret is tacked onto player-facing prose. Example of the current output:

> The townsfolk honor Hesp of the Long Memory... Known for a cursed well no one will cap; rebuilt atop its own ashes. Its heart is the Docks. Notably, it is built atop a great bridge, trade flowing through constantly. A local tradition: The Quiet Procession...

## Goal

Replace the stitched paragraph with **structured flavor facts rendered as a data list** plus **one short distilled hook** as the description. Move the GM secret to the dedicated `gmNotes` field. Make the flavor fields editable.

## Decisions (locked)

1. **Flavor becomes structured data**, not prose — rendered as a label/value data list (matches the region Lore/details treatment already shipped).
2. **Description = a distilled one-line hook**, generated from the settlement's defining traits.
3. **New realms only.** No migration, no schema version bump. (Dexie persists new non-indexed properties on `pois` automatically; existing rows leave them `undefined` and render "—". Existing realms keep their current run-on descriptions untouched.)
4. **Structure-quirk** draw is folded into the hook — not stored, not its own row.
5. **GM Notes** overview card is **read-only**; editing happens on the settlement edit page.

## Data model

Add a nested optional field to `POI` (mirrors the existing `POI.trade` object shape):

```ts
// src/domain/entities/POI.ts
settlementFlavor: {
  knownFor: string
  district: string
  notableFeature: string
  tradition: string
  guild: string | null
} | null
```

- `buildPOI` defaults `settlementFlavor: null`.
- The GM secret uses the existing `POI.gmNotes: string` field.
- **No `db.ts` change, no migration** — this is a non-indexed property.

## Generation — `src/domain/services/worldgen/buildSettlement.ts`

Replace the description-stitching block (lines ~83-88):

- Populate `settlement.settlementFlavor = { knownFor, district, notableFeature: feature, tradition: festival, guild }` from the existing table draws.
- Set `settlement.gmNotes = secret` (the `SETTLEMENT_SECRETS` draw; keep the existing child-rng so building generation stays byte-identical).
- Set `settlement.description = buildSettlementHook(settlement, flavor, structureQuirk, rng)`.
- The `structureQuirk` draw is passed to the hook generator (may be used or ignored) and is NOT stored.

### New unit — `buildSettlementHook`
`src/domain/services/worldgen/buildSettlementHook.ts` (pure, seeded):
```ts
export function buildSettlementHook(
  settlement: POI,
  flavor: { knownFor: string; district: string; notableFeature: string; tradition: string; guild: string | null },
  structureQuirk: string,
  rng: SeededRandom,
): string
```
- Produces ONE natural sentence distilled from 2-3 defining signals: settlement type/size, terrain/biome, trade (`settlement.trade?.produces`), and `knownFor` (optionally `structureQuirk`).
- Varied sentence templates so it does not read as a fixed slot chain. Deterministic under a fixed seed.
- Example target: *"A bridge-town on the trade road, uneasy over a cursed well no one will cap."*

## Rendering — `src/components/poi-templates/SettlementTemplate.tsx`

1. **Description** already renders `detailLine = cleanText(poi.description)` (line 840, 891-894) — now just the short hook. No change beyond it being shorter.
2. **New "Character" data list** — a label/value block (Known for · Heart · Notable · Tradition · Guild) in the LEFT column beside the existing Location facts. Reads `poi.settlementFlavor`; if `null`/missing, render "—" per row or hide the block. Mirror the existing `dl` markup used for Location (Prosperity/Size/Produces/Needs).
3. **New "GM Notes" card** — placed directly UNDER `<OverviewRoutes>` in the RIGHT column (after line ~1134). Amber GM-only styling (mirror the "Looming Problem" block at lines 901-928). Read-only; shows `poi.gmNotes`. Hide when `gmNotes` is empty.

## Edit page — `src/routes/_app/realms/pois_.$poiId_.edit.tsx`

- The form already edits `description` and `gmNotes` — no change there (the hook is editable via the existing Description field; the secret via the existing GM Notes field).
- **Add inputs for the flavor fields**, shown only when the POI is a settlement (`isSettlement(poi)` / by `type`): Known for, Heart (district), Notable (feature), Tradition, Guild. Flatten `poi.settlementFlavor` into the `form` state on load; reassemble into the nested object on save via `executeUpdatePOI`. When the POI has no `settlementFlavor` (old data), initialize empty strings and let the GM fill them (saving creates the object).

## Testing

- `buildSettlementHook` unit: deterministic under fixed seed; output is a single sentence; uses defining traits; varies across seeds.
- `buildSettlement`: populates `settlementFlavor` (all fields) and `gmNotes`; `description` contains NO `"GM secret:"` and none of the old connectives (`"Known for"`, `"Its heart is"`, `"A local tradition:"`).
- Re-baseline `GenerateWorld.golden.test.ts` (inspect the diff — expect only settlement description/flavor/gmNotes changes; if unrelated content shifts, stop).
- `SettlementTemplate`: renders the Character data list and the GM Notes card under Routes when data present; hides/—s them when absent.
- Edit page: flavor inputs appear for settlements, load current values, and persist on save (round-trip).

## Out of scope

- No migration or backfill of existing realms.
- No changes to non-settlement POI kinds.
- No editable-inline GM Notes in the overview (edit page only).

## Sequencing

Land on a dedicated branch (`feature/settlement-description-redesign` or similar) AFTER Phase 6 Doom Task D merges, to avoid a golden-snapshot collision with the in-flight doom integration.
