# Settlement Description Redesign — Design Spec

> **Status:** Approved design (2026-06-30). Implementation deferred to a dedicated branch AFTER Phase 6 Doom (Task D) merges — this changes `buildSettlement.ts` output and the worldgen golden snapshot, which Task D also re-baselines. Do not start on the doom branch.
> **Author:** Design conversation, 2026-06-30.

## Problem

Every settlement's `description` is a fixed 6-slot clause chain welded into one paragraph (`buildSettlement.ts:83-88`): `<patron intro> + " Known for X; <quirk>. Its heart is <district>." + " Home to <guild>." + " Notably, <feature>." + " A local tradition: <festival>" + "\n\nGM secret: <secret>"`. It reads as a run-on pile of random draws, and a GM-only secret is tacked onto player-facing prose. Example of the current output:

> The townsfolk honor Hesp of the Long Memory... Known for a cursed well no one will cap; rebuilt atop its own ashes. Its heart is the Docks. Notably, it is built atop a great bridge, trade flowing through constantly. A local tradition: The Quiet Procession...

## Goal

Replace the stitched paragraph with **structured flavor facts rendered as a data list** plus **one short distilled hook** as the description. Replace the random one-line "GM secret" with **GM notes derived from the settlement's real situation** (needs, factions, wealth, front, doom), written into the dedicated `gmNotes` field. Make the flavor fields editable.

## Decisions (locked)

1. **Flavor becomes structured data**, not prose — rendered as a label/value data list (matches the region Lore/details treatment already shipped).
2. **Description = a distilled one-line hook**, generated from the settlement's defining traits.
3. **New realms only.** No migration, no schema version bump. (Dexie persists new non-indexed properties on `pois` automatically; existing rows leave them `undefined` and render "—". Existing realms keep their current run-on descriptions untouched.)
4. **Structure-quirk** draw is folded into the hook — not stored, not its own row.
5. **GM Notes** overview card is **read-only**; editing happens on the settlement edit page.
6. **GM notes are derived from the world**, not a random secret draw. The `SETTLEMENT_SECRETS` single-draw model is retired (table may be deleted or left unused). GM notes are composed from the settlement's actual state as a short bulleted list.

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
- Set `settlement.description = buildSettlementHook(settlement, flavor, structureQuirk, rng)`.
- The `structureQuirk` draw is passed to the hook generator (may be used or ignored) and is NOT stored.
- **Stop drawing `SETTLEMENT_SECRETS` and stop writing `gmNotes` here** — GM notes are derived in a late post-pass (see below), because the signals they need (trade, wealth, fronts, doom) do not exist yet at settlement-build time. Drop the `SETTLEMENT_SECRET_TABLE_ID`/`SETTLEMENT_SECRETS` import and its child-rng. (Removing that child-rng does not disturb the main rng stream, so building generation stays byte-identical.)

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

## GM notes — derived from the world (new post-pass)

GM notes stop being a disconnected random secret and become a short, actionable
prep summary composed from the settlement's real situation. Because the inputs
are computed *after* settlements are placed (trade at `generateWorld.ts:850`,
then wealth, then region fronts, then doom), this runs as a **late post-pass**
over already-built settlements — not inside `buildSettlement`.

### New service — `src/domain/services/worldgen/deriveSettlementGmNotes.ts` (pure, seeded)
```ts
export interface SettlementGmNotesContext {
  settlement: POI
  region: Region
  connections: Connection[]        // realm-wide; filter kind==='supplies'
  pois: POI[]                      // for resolving suppliers/holders by id
  factions: Faction[]
  factionPresences: FactionPresence[]
  relationships: FactionRelationship[]
  doom: Doom | null                // Phase 6 (optional; realm may have none)
}
export function deriveSettlementGmNotes(
  ctx: SettlementGmNotesContext,
  rng: SeededRandom,
): string   // markdown bullet list; '' when nothing notable
```

Compose 2–4 bullet lines by priority, drawing only from signals that are
actually present (skip absent ones — never pad):

1. **Unmet need + who holds it** — a `trade.needs` entry with no `supplies`
   connection into this settlement. If a nearby settlement/faction produces it,
   name them; if that holder's faction is hostile/rival to a faction seated
   here, flag it as leverage/tension. (Ties P2 trade + faction relationships.)
2. **Wealth posture** — from `poi.wealthBand`: rich + low guard → raid/extortion
   target; destitute → desperate, cheap loyalty; monopoly holder → a target.
   (Ties P3 wealth.)
3. **Contested resource** — the region's guaranteed contested resource (P3): who
   contests it and what the settlement's stake is.
4. **Regional front** — `region.front` (P3 mini-clock): the moving threat nearby
   and how close/relevant it is.
5. **Doom proximity** — if a `Doom` targets this settlement's region/resource or
   spreads via a vector that passes through it (P6), one line on the omen.
6. **Local trouble** — fold in the existing `poi.trouble` if not already implied.

Deterministic under a fixed seed. System-agnostic. Output is markdown so the
render layer can show it as a list.

### Wiring — `generateWorld.ts`
After wealth, region fronts, and doom are generated (near the end of the
pipeline), iterate settlements and set `poi.gmNotes = deriveSettlementGmNotes(...)`.
This replaces the removed inline secret. New realms only.

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
