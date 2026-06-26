# POI-Driven Town Generator — Design

**Date:** 2026-06-25
**Status:** Approved (pending spec review)
**Branch:** `feature/poi-town-generator`

## Problem

Today a settlement's map is either an uploaded image or an imported Watabou
city — a static backdrop the GM drops POI **pins** on. The buildings in a
Watabou import are anonymous polygons with no link to the GM's POIs.

We want the opposite relationship: the GM's own POIs **are** the buildings.
The GM places a point per building; a generator grows building footprints +
streets around those fixed points and emits a clean, schematic town map. Each
footprint is clickable and opens its POI. Every settlement auto-gets such a
map, swappable for a custom upload.

## Goals

- Settlement POI auto-gets a generated **town map**, replaceable with an upload.
- GM places child building POIs as anchors; their **positions are authoritative**.
- Generator produces a **schematic / clean** map (not Watabou-organic): per-anchor
  footprints, simple roads, optional wall — all clickable → the POI.
- Reuse existing systems (POI placement, markers, MapLibre rendering, the MFCG
  feature format) wherever possible. Only the generator is genuinely new.

## Non-Goals (YAGNI)

- No Watabou-organic fidelity (Voronoi wards, terrain-following streets). The
  Watabou **import** path already covers that look; this is the complementary
  authored-town path.
- No auto-placement / auto-layout of anchors. The GM places points by hand.
- No terrain-aware road routing. Roads are legible, not simulated.
- No change to the existing Watabou import or image-upload flows.

## Decisions (resolved)

| Question | Decision |
|---|---|
| Footprint source | **Generate our own layout** (not link-to-Watabou). |
| POI ↔ building | **POIs drive generation**; positions are authoritative. |
| Point placement | GM **manually places** a point/marker per building. |
| Fidelity | **Schematic / clean** — footprints + simple roads + optional wall. |
| Scope | **Both** village & city, via a **preset** that tunes density/wall/roads. |
| Default behavior | Every settlement **auto-gets** a town map; user can **replace** it. |
| Footprint shapes | **Rect + rounded-blob mix**, keyed to POI type. |
| Walls | Preset default (village off / city on) **+ manual override toggle**. |

## Architecture

Five well-bounded units. Only Unit C is new logic; the rest is wiring into
systems that already exist.

### A. Storage & ownership

- A settlement POI owns a `GameMap` (`ownerPoiId = settlement`) — the existing
  owner relationship.
- Extend `GameMap`:
  - `kind: 'image' | 'hex' | 'town'` (add `'town'`).
  - `townData: WatabouCityData | null` — generated feature array, in the
    **existing MFCG shape** so `parseWatabouExport` and `WatabouCityRenderer`
    already understand it. No new format.
  - `townPreset: 'village' | 'city' | null`, `townSeed: string | null`,
    `townWalled: boolean | null` (override; null = preset default).
- Dexie migration: additive fields, default `kind` stays `'image'` for existing
  rows; new fields default null. No backfill needed.

**Auto-create + replace:** when a settlement POI is created, also create its
empty `kind:'town'` GameMap (parchment canvas, no `townData` yet). "Replace map"
swaps it to an uploaded `kind:'image'` map. Generation is the default, never
forced — an empty town map is valid and just shows the canvas + any pins.

### B. Anchors = child POIs (reuses existing placement)

- Child building POIs are placed via the existing `place-poi` mode and stored
  with `position {x,y}` + `mapRef = townMap.id`. No new placement system.
- Each placed child POI is an **anchor**. Its `type` selects a footprint shape
  from a lookup table (Unit C). Dragging the marker moves the anchor.
- Anchor → generator input: `{ poiId, x, y, type }`.

### C. The generator (new)

`lib/towngen/generateTown.ts`:

```ts
generateTown(
  anchors: TownAnchor[],
  opts: { preset: 'village' | 'city'; seed: string; walled?: boolean },
): WatabouCityData
```

Pure, deterministic (seeded PRNG; no `Date.now`/`Math.random` — seed-derived).
Same anchors + seed ⇒ identical town. Steps:

1. **Footprints** — one per anchor, shape/size from `FOOTPRINT_TABLE[type]`
   (rect for house/building/settlement, rounded-blob for shrine/temple-ish
   types, sized small→large). Each footprint feature carries
   `properties.id = poiId` so it round-trips back to its POI. Footprints nudge
   apart on overlap (simple separation pass).
2. **Roads** — connect each footprint to its nearest neighbor / a derived spine.
   Emitted as `LineString` features classed `road`. Legible, not terrain-aware.
3. **Wall + towers + gate** — if walled (override ?? preset default), a
   convex-ish hull offset outward around the footprints, with tower points and
   one gate gap on the busiest road. Classed `wall` / `tower`.
4. **Ground + water** — an `earth` base polygon under the bounds; optional
   hand-placeable water/river left for a later iteration (out of MVP scope).

`FOOTPRINT_TABLE` and `PRESETS` (density, road width, wall default) live beside
the generator as plain data — easy to tune, unit-tested.

### D. Render & interaction (MapLibre)

- `MapViewer` gains a `kind:'town'` background path: feed `townData.features`
  as a GeoJSON source with **fill layers** (earth/building/plaza/water) and
  **line layers** (road/wall/river), reusing the `COLORS` palette already in
  `WatabouCityRenderer`. Pins/markers/labels render on top exactly as today.
- **Footprint click → POI:** a MapLibre click handler on the building fill layer
  reads `properties.id` and opens the existing POI popup — the same popup a
  marker click opens. Building and pin are one thing.
- The standalone settlement detail view can keep using `WatabouCityRenderer`
  over the same `townData` for a static read-only render (no new work).

### E. Generate / Regenerate UX

- A **"Generate town"** / **"Regenerate"** button on the town map toolbar runs
  Unit C from the current anchors + stored seed/preset/override and saves
  `townData`. Re-running after drags reflows footprints.
- Preset selector (village/city) and wall toggle live in the same control,
  persisted to the GameMap.

## Data Flow

```
GM places child POIs (markers) ──> anchors {poiId,x,y,type}
                                        │
                       [Generate] ─> generateTown(anchors, preset, seed, walled)
                                        │
                                 WatabouCityData ──> GameMap.townData (Dexie)
                                        │
                    MapViewer: GeoJSON fill/line layers + markers on top
                                        │
              click footprint ─(properties.id)─> POI popup (existing)
```

## Error / Edge Handling

- **Zero anchors:** generator returns an empty/earth-only town; map shows the
  canvas. No error.
- **Overlapping anchors:** separation pass nudges footprints apart; if still
  overlapping, they overlap visually — acceptable, GM can drag.
- **Replaced-then-regenerate:** replacing with an image clears `kind` to
  `'image'`; regenerate is hidden unless `kind:'town'`.
- **Deterministic seed:** seed stored on the GameMap at create time (ULID-style,
  passed in — not generated inside the pure function).
- **Existing maps:** migration leaves all current maps `kind:'image'`; nothing
  regenerates implicitly.

## Testing

- **Unit (Vitest), Unit C:** determinism (same input ⇒ deep-equal output);
  footprint count == anchor count; every footprint carries its `poiId`; preset
  toggles wall presence; separation resolves trivial overlaps; empty-anchor case.
- **Footprint table:** each POI type maps to a shape within expected size bounds.
- **Render smoke:** `townData` round-trips through `parseWatabouExport` /
  `WatabouCityRenderer` without throwing (shared-format guarantee).
- **Interaction (component):** footprint click resolves `properties.id` to the
  right POI popup.

## File Touch List (anticipated)

- `src/lib/towngen/generateTown.ts` (new) + `presets.ts`, `footprints.ts` (new)
- `src/lib/towngen/generateTown.test.ts` (new)
- `src/domain/entities/GameMap.ts` (add `'town'`, `townData`, `townPreset`,
  `townSeed`, `townWalled`)
- Dexie schema + migration (additive)
- `src/components/map/MapViewer.tsx` (town background layers + footprint click)
- `src/components/map/MapToolbar.tsx` + `InteractiveMap.tsx` (Generate/preset UI)
- Settlement POI create flow (auto-create town GameMap)

## Open Questions

None blocking. Water/river hand-placement deferred to a follow-up.
