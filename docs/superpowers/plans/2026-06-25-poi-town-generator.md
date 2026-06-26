# Image-Backed Town Maps Implementation Plan

**Date:** 2026-06-26
**Branch:** `feature/poi-town-generator`
**Status:** Pivot plan after schematic generator failed.

## Goal

Settlement maps should use pre-downloaded Watabou town maps.
Child POIs should land on real buildings from the map JSON.

The result must look like a town, not a generated grid.

## Background

The first custom generator produced same-looking schematic towns.
Buildings landed in a grid.
Roads connected grid points.
The result looked like tic-tac-toe, not a settlement.

We are intentionally abandoning that generator.

## New Direction

- Use bundled Watabou PNGs as the visual map.
- Use sibling Watabou JSON as map geometry.
- Extract real building polygons from JSON.
- Place POI markers at building centroids.
- Never synthesize roads, walls, or building footprints.
- Let users drag markers after automatic placement.
- Support settlements and other POI-owned maps.

## Non-Goals

- No custom road generation.
- No generated schematic building layout.
- No wall or gate generation.
- No grid placement except as last-resort fallback.
- No attempt to make every building clickable in this increment.

## Current Branch State

- `GameMap.kind` includes `'town'`.
- Dexie `v37` adds town defaults.
- `executeGetOrCreateTownMap` creates image-backed town maps.
- `src/maps/townMaps.ts` loads bundled town PNGs.
- `src/maps/city/**` contains PNG and JSON map pairs.
- Settlement detail has a **Town Map** button.
- `MapViewer` renders image-backed town maps.
- Obsolete `src/lib/towngen` custom-generator files were removed.

## Main Failure To Fix

Current placement is not using actual building geometry.
Markers can land in a grid over the town image.

Root cause: placement uses synthetic positions instead of JSON building centroids.

## Architecture

### A. Map Assets

Each bundled town map has:

- `src/maps/city/<bucket>/<name>.png`
- `src/maps/city/<bucket>/<name>.json`

The PNG is the rendered backdrop.
The JSON is the source of building geometry.

`src/maps/townMaps.ts` should expose both URLs.

### B. Town Map Creation

`executeGetOrCreateTownMap` remains the owner of map creation.

It creates one `kind:'town'` map per owner POI.
It stores the selected PNG in `imageUrl`.
It stores actual image dimensions in `width` and `height`.

Town maps are image-backed.
They are not imageless generated canvases.

### C. Building Geometry

Add a parser that converts Watabou JSON into building candidates.

Candidate shape:

```ts
export interface TownBuildingCandidate {
  id: string
  centroid: { x: number; y: number }
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  area: number
}
```

Selection rules:

- Parse JSON through existing Watabou normalization where practical.
- Use `classifyFeature(feature) === 'building'`.
- Handle `Polygon` and `MultiPolygon`.
- Ignore tiny artifacts below an area threshold.
- Sort candidates deterministically.
- Normalize coordinates into the PNG pixel frame.

### D. POI Assignment

Assign child POIs to building candidates.

Rules:

- Existing placed POIs keep their positions.
- Unplaced child POIs get assigned to available buildings.
- Deterministic seed: `townMap.id` plus `poi.id`.
- Prefer larger buildings for important POI types.
- Avoid duplicate building assignment.
- Fallback grid only if JSON parsing fails or candidates run out.

### E. User Flow

1. User opens a settlement.
2. User clicks **Town Map**.
3. App picks a bundled town map.
4. App creates or reuses the POI-owned town map.
5. App parses the sibling JSON.
6. App places unplaced child POIs on real building centroids.
7. User opens the map and sees markers on buildings.
8. User can drag markers to correct placement.

## File Plan

| File | Change |
|---|---|
| `src/maps/townMaps.ts` | Include JSON asset URLs beside PNG URLs. |
| `src/maps/townMapGeometry.ts` | New parser for building candidates. |
| `src/maps/townPoiPlacement.ts` | New deterministic POI-to-building assignment. |
| `src/application/use-cases/GetOrCreateTownMap.ts` | Preserve image-backed town behavior. |
| `src/routes/_app/realms/pois_.$poiId.tsx` | Create town map, load JSON, place child POIs. |
| `src/application/use-cases/ImportRealm.ts` | Preserve town image data on import. |
| `src/application/use-cases/ExportRealm.ts` | Keep exporting image-backed town maps. |
| `src/components/map/InteractiveMap.tsx` | No generator controls. Keep normal POI placement. |
| `src/components/map/MapViewer.tsx` | Keep image-backed rendering. |

---

## Task 1: Fix town map asset metadata

**Goal:** `TOWN_MAPS` exposes both PNG and JSON URLs.

**Files:**

- Modify: `src/maps/townMaps.ts`
- Test: `src/maps/townMaps.test.ts`

**Required behavior:**

- Each `TownMap` has `id`, `bucket`, `imageUrl`, and `jsonUrl`.
- The parser can load the matching JSON for a chosen PNG.
- Selection remains deterministic.

**Steps:**

- [x] Add `jsonUrl` to `TownMap`.
- [x] Load JSON assets with `import.meta.glob('./city/**/*.json', { query: '?url' })`.
- [x] Join PNG and JSON by bucket and basename.
- [x] Exclude incomplete pairs.
- [x] Test that every `TOWN_MAPS` item has both URLs.
- [x] Test `pickTownMap(seed)` remains deterministic.

---

## Task 2: Parse real building candidates

**Goal:** Extract real buildings from Watabou JSON.

**Files:**

- Create: `src/maps/townMapGeometry.ts`
- Test: `src/maps/townMapGeometry.test.ts`

**Interfaces:**

```ts
export interface TownBuildingCandidate {
  id: string
  centroid: { x: number; y: number }
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  area: number
}

export function extractTownBuildings(rawJson: unknown): TownBuildingCandidate[]
```

**Required behavior:**

- Accept bundled Watabou FeatureCollection JSON.
- Normalize with existing MFCG parsing if possible.
- Classify buildings with `classifyFeature`.
- Support `Polygon` and `MultiPolygon`.
- Compute area-weighted centroids.
- Return candidates in deterministic order.
- Filter tiny artifacts.

**Steps:**

- [x] Write tests using one small bundled JSON fixture.
- [x] Add coordinate walkers for polygons and multipolygons.
- [x] Compute polygon area and centroid.
- [x] Build candidate bounds.
- [x] Sort by `area desc`, then `id`.
- [x] Verify extracted candidate count is not zero.
- [x] Verify centroids are finite numbers.

---

## Task 3: Normalize JSON coordinates to image pixels

**Goal:** Candidate centroids must line up with the PNG frame.

Watabou JSON coordinates can be origin-centered or negative.
The image map uses pixel coordinates from top-left.

**Files:**

- Modify: `src/maps/townMapGeometry.ts`
- Test: `src/maps/townMapGeometry.test.ts`

**Interface:**

```ts
export function extractTownBuildings(
  rawJson: unknown,
  imageSize: { width: number; height: number },
): TownBuildingCandidate[]
```

**Required behavior:**

- Read all feature coordinates.
- Compute source bounds.
- Scale and translate into `0..width` and `0..height`.
- Preserve relative geometry.
- Clamp tiny floating-point drift.
- Reject invalid candidates after normalization.

**Steps:**

- [x] Add tests asserting every centroid is inside image bounds.
- [x] Add tests against at least one `sm`, `md`, and `larg` map.
- [x] Implement bounds scan over all geometries.
- [x] Implement source-to-pixel transform.
- [x] Apply transform before centroid output.

---

## Task 4: Assign POIs to buildings

**Goal:** Unplaced child POIs land on real buildings.

**Files:**

- Create: `src/maps/townPoiPlacement.ts`
- Test: `src/maps/townPoiPlacement.test.ts`

**Interfaces:**

```ts
export function assignPoisToBuildings(input: {
  pois: POI[]
  buildings: TownBuildingCandidate[]
  mapId: string
  imageSize: { width: number; height: number }
}): Array<{
  poiId: string
  position: { x: number; y: number }
  source: 'building' | 'fallback'
  buildingId?: string
}>
```

**Required behavior:**

- Skip POIs already placed on this map.
- Skip POIs with an existing map placement elsewhere.
- Assign each POI to one building.
- Prefer larger buildings for settlement, district, fortification, landmark.
- Use deterministic ordering for ties.
- Fallback grid only after candidates run out.
- Mark fallback positions separately in tests.

**Steps:**

- [x] Test no duplicate building assignment.
- [x] Test output is deterministic.
- [x] Test existing placed POIs are skipped.
- [x] Test important types prefer larger buildings.
- [x] Test fallback only happens when buildings are exhausted.

---

## Task 5: Wire placement into the Town Map button

**Goal:** Clicking **Town Map** creates the map and places child POIs.

**Files:**

- Modify: `src/routes/_app/realms/pois_.$poiId.tsx`

**Required behavior:**

- Pick a bundled town map.
- Load PNG dimensions.
- Create or reuse `kind:'town'` map.
- Fetch and parse matching JSON.
- Get child POIs for the settlement.
- Place unplaced children on real building centroids.
- Leave existing placements untouched.
- Show usable failure feedback if JSON loading fails.

**Implementation notes:**

- Use `executePlacePOIOnMap` for persistence.
- Keep the button disabled while work is running.
- Use existing child POI data already loaded on the route.
- Do not add generator controls to `InteractiveMap`.

**Steps:**

- [x] Add loading state for the Town Map button.
- [x] Fetch `picked.jsonUrl`.
- [x] Parse building candidates.
- [x] Assign child POIs.
- [x] Persist placements.
- [x] Navigate or expose the created town map consistently.

---

## Task 6: Fix town import/export image handling

**Goal:** Exported and imported town maps retain their image backdrop.

**Files:**

- Modify: `src/application/use-cases/ImportRealm.ts`
- Test: `src/application/use-cases/ExportImportRealm.roundtrip.test.ts`

**Current issue:**

`ImportRealm.ts` blanks `imageUrl` for `kind === 'town'`.
That matched the old imageless generator.
It is wrong for image-backed town maps.

**Required behavior:**

- `kind:'hex'` maps keep blank image URLs.
- `kind:'town'` maps import image data like image maps.
- Missing image data should not crash import.
- Town metadata can still round-trip.

**Steps:**

- [ ] Update import image URL condition.
- [ ] Add round-trip coverage for image-backed town maps.
- [ ] Keep old imageless town maps tolerated if encountered.

---

## Task 7: Manual verification

**Goal:** Confirm towns look like towns.

**Checklist:**

- [ ] Create or open a settlement with 8+ child POIs.
- [ ] Click **Town Map**.
- [ ] Open the created map.
- [ ] Confirm markers land on real buildings.
- [ ] Confirm markers do not form an obvious grid.
- [ ] Confirm different settlements can pick different town maps.
- [ ] Confirm dragged marker positions persist.
- [ ] Export and import the realm.
- [ ] Confirm town backdrops still render after import.

## Success Criteria

- Towns are visually distinct.
- Roads come from the PNG, not generated lines.
- Buildings come from the PNG/JSON, not synthetic footprints.
- POI markers land on plausible buildings.
- No tic-tac-toe layout appears unless JSON parsing fails.
- Existing manual placement still works.

## Follow-Up Ideas

- Building click opens the assigned POI.
- Highlight assigned building under selected marker.
- Add a reassignment mode for moving POIs between buildings.
- Use JSON districts or wards to group child POIs.
- Let users choose the town map manually.
