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
| Default behavior | Settlement **lazily gets** a town map on first map-tab open; user can **replace** it. (Revised from auto-on-create — see §A.) |
| Footprint shapes | **Rect + rounded-blob mix**, keyed to POI type. |
| Walls | Preset default (village off / city on) **+ manual override toggle**. |

## Architecture

Five well-bounded units. Only Unit C is new logic; the rest is wiring into
systems that already exist.

### A. Storage & ownership

- A settlement POI owns a `GameMap` (`ownerPoiId = settlement`) — the existing
  owner relationship.
- Extend `GameMap` (this is a **coordinated change**, not a one-liner — `kind`
  is switched on in several places):
  - `kind: 'image' | 'hex' | 'town'` (add `'town'`). Must update in lockstep:
    the `GameMap.kind` union (`GameMap.ts:17`), `executeCreateGameMap`
    (hardcodes `kind:'image'`, `CreateGameMap.ts:26`), the export/import shape
    (`ExportRealm.ts:64`, `ImportRealm.ts:235`), and every renderer that
    switches on `kind`.
  - `townData: WatabouCityData | null` — generated feature array. We **reuse the
    MFCG feature *shape*** (so `WatabouCityRenderer` can statically render it),
    but we **construct it directly and never round-trip it through
    `parseWatabouExport`** (see §C/§D for why that claim was wrong).
  - `townPreset: 'village' | 'city' | null`, `townSeed: string | null`,
    `townWalled: boolean | null` (override; null = preset default).
  - `imageUrl` is required-but-empty (`''`) and `width`/`height` define the
    **pixel canvas** the town is generated into (see §C — this matters).
- Dexie migration: additive fields, default `kind` stays `'image'` for existing
  rows; new fields default null. No backfill needed.

**Lazy-create + replace (revised — NOT auto-on-POI-creation):** Do **not**
create the town map inside `executeCreatePOI`. That hook is wrong: import
bypasses it (`ImportRealm.ts:183`, giving interactive-vs-imported settlements
different shapes), it fires on overworld click-to-create (orphan blank maps),
and it clutters exports. Instead, a **`getOrCreateTownMap(poiId)`** use-case
materializes the `kind:'town'` GameMap on **first open of the settlement's map
tab** — matching the existing lazy `mapSection` pattern (`pois_.$poiId.tsx:275`),
and creating consistently for both interactive and imported settlements.
"Replace map" swaps it to an uploaded `kind:'image'` map. An empty town map is
valid and just shows the canvas + any pins.

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
Same anchors + seed ⇒ identical town.

**Coordinate space (critical):** the generator emits in **POI pixel space** —
top-left origin, x-right, **y-down**, bounded by `0..map.width × 0..map.height`,
the exact frame `POI.position {x,y}` lives in. It does **not** emit
origin-centered MFCG coords. This is what makes footprints share a frame with
the markers; §D then transforms them through `pxToLngLat` like every other
MapLibre layer.

Steps:

1. **Footprints** — one per anchor, shape/size from `FOOTPRINT_TABLE[type]`
   (rect for house/building/settlement, rounded-blob for shrine/temple-ish
   types, sized small→large). Each footprint feature sets
   **`properties.id` to a real MFCG kind string** (e.g. `'buildings'`) so
   `classifyFeature` (`WatabouCityRenderer.tsx:14-33`) colors it correctly, and
   carries the owning POI id in a **separate `properties.poiId`**. (`properties.id`
   is load-bearing for classification — a ULID there misclassifies `Polygon`
   footprints as `plaza`.) Footprints nudge apart on overlap (simple separation
   pass).
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

- `MapViewer` gains a `kind:'town'` background path: build a GeoJSON
  FeatureCollection from `townData.features` where **every coordinate is first
  run through `pxToLngLat`** (mirroring the path layer at `MapViewer.tsx:457`),
  then add **fill layers** (earth/building/plaza/water) and **line layers**
  (road/wall/river), reusing the `COLORS` palette from `WatabouCityRenderer`.
  Skipping the transform is the documented coordinate-mismatch failure — do not
  feed raw feature coords to the source. Pins/markers/labels render on top as today.
- **Footprint click → POI:** a MapLibre click handler on the building fill layer
  reads **`properties.poiId`** (not `properties.id`) and opens the existing POI
  popup — the same popup a marker click opens. Building and pin are one thing.
- The standalone settlement detail view can keep using `WatabouCityRenderer`
  over the same `townData` for a static read-only render (it auto-fits any
  coordinate range, so pixel-space data renders fine). Note: that renderer has
  **no click wiring today** — footprint→POI interaction lives only on the
  MapViewer surface; the detail view stays static (clickable detail-view
  footprints would be new work, out of MVP scope).

### E. Generate / Regenerate UX

- A **"Generate town"** / **"Regenerate"** button on the town map toolbar runs
  Unit C from the current anchors + stored seed/preset/override and saves
  `townData`. Re-running after drags reflows footprints.
- Preset selector (village/city) and wall toggle live in the same control,
  persisted to the GameMap.

## Data Flow

```
open settlement map tab ──> getOrCreateTownMap(poiId)  [lazy, not on POI create]
                                        │
GM places child POIs (markers) ──> anchors {poiId,x,y,type}   (POI pixel space)
                                        │
                       [Generate] ─> generateTown(anchors, preset, seed, walled)
                                        │           (emits in POI pixel space;
                                        │            properties.id=kind, properties.poiId=ULID)
                                 WatabouCityData ──> GameMap.townData (Dexie)
                                        │
            MapViewer: coords → pxToLngLat → GeoJSON fill/line layers + markers on top
                                        │
              click footprint ─(properties.poiId)─> POI popup (existing)
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
  footprint count == anchor count; every footprint carries `properties.poiId`
  AND a valid kind string in `properties.id`; all coords within
  `0..width × 0..height` (pixel-space guarantee); preset toggles wall presence;
  separation resolves trivial overlaps; empty-anchor case.
- **Footprint table:** each POI type maps to a shape within expected size bounds.
- **Classification:** `classifyFeature` returns `'building'` for every emitted
  footprint (guards the `properties.id`-vs-`poiId` regression).
- **Interaction (component):** footprint click resolves `properties.poiId` to the
  right POI popup.

## File Touch List (anticipated)

- `src/lib/towngen/generateTown.ts` (new) + `presets.ts`, `footprints.ts` (new)
- `src/lib/towngen/generateTown.test.ts` (new)
- `src/domain/entities/GameMap.ts` (add `'town'`, `townData`, `townPreset`,
  `townSeed`, `townWalled`)
- `src/application/use-cases/CreateGameMap.ts` (kind no longer hardcoded
  `'image'`) and `src/application/use-cases/GetOrCreateTownMap.ts` (new, lazy)
- `ExportRealm.ts` / `ImportRealm.ts` (`kind:'town'` + new fields in the
  export/import shape)
- Dexie schema + migration (additive)
- `src/components/map/MapViewer.tsx` (town background layers via `pxToLngLat` +
  footprint click reading `properties.poiId`)
- `src/components/map/MapToolbar.tsx` + `InteractiveMap.tsx` (Generate/preset UI)
- `src/routes/_app/realms/locations/pois_.$poiId.tsx` (map-tab lazy create hook)

## Open Questions

None blocking. Water/river hand-placement deferred to a follow-up.
