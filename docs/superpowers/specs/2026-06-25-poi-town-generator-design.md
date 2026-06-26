# Image-Backed Town Maps - Design

**Date:** 2026-06-26
**Status:** Pivoted from custom schematic generation
**Branch:** `feature/poi-town-generator`

## Problem

The first town generator made maps from synthetic anchors.
It produced grid-like buildings and simple connecting roads.
Every town looked almost the same.

This failed the product goal.
Town maps should feel like real places.

## Goal

Use pre-downloaded Watabou town maps as the visual source of truth.
Place child POIs onto real buildings extracted from matching JSON.

## Decisions

| Question | Decision |
|---|---|
| Visual source | Bundled Watabou PNGs. |
| Geometry source | Matching bundled Watabou JSON. |
| Map type | `GameMap.kind === 'town'`, image-backed. |
| POI placement | Assign unplaced children to real building centroids. |
| Roads | Already in PNG. Do not generate roads. |
| Buildings | Already in PNG/JSON. Do not generate footprints. |
| Fallback | Grid only after JSON failure or candidate exhaustion. |
| Editing | Users can drag POI markers after auto-placement. |

## Architecture

### A. Assets

Each town asset is a pair:

- `src/maps/city/<bucket>/<name>.png`
- `src/maps/city/<bucket>/<name>.json`

`bucket` is `sm`, `md`, or `larg`.

`src/maps/townMaps.ts` exposes deterministic map selection.
It should expose both image and JSON URLs.

### B. Storage

Town maps are `GameMap` records:

- `kind: 'town'`
- `ownerPoiId`: settlement or other owning POI
- `imageUrl`: bundled Watabou PNG URL
- `width` and `height`: PNG natural dimensions
- `townData`: optional future metadata, currently not required

Town maps are not imageless generated canvases.

### C. Geometry Extraction

The bundled JSON is parsed into building candidates.

The parser:

- normalizes MFCG feature shapes
- identifies buildings with `classifyFeature`
- supports `Polygon` and `MultiPolygon`
- computes area, bounds, and centroid
- transforms source coordinates into image pixel space
- returns candidates in deterministic order

### D. POI Placement

Child POIs are assigned to building candidates.

Rules:

- preserve existing placements
- assign unplaced children only
- avoid duplicate building assignments
- prefer larger buildings for important POI types
- use deterministic tie-breaking
- use fallback grid only when necessary

### E. Rendering

`MapViewer` renders the PNG as a normal image source.
POI markers render above it through existing map placement.

No custom town layers are required for the MVP.

## Data Flow

```text
click Town Map
  -> pick bundled TownMap
  -> load PNG dimensions
  -> get or create kind:'town' GameMap
  -> fetch matching JSON
  -> extract building candidates
  -> assign child POIs to candidates
  -> persist POI mapRef + position
  -> open image-backed map with markers
```

## Edge Cases

- Existing town map: reuse it.
- Existing POI placement: keep it.
- JSON fails: create map, but do not fake success.
- Too many POIs: assign real buildings first, fallback for overflow.
- Missing PNG dimensions: block creation and show feedback.
- Imported town map: keep image data if present.

## Testing

- Asset pairs exist for every `TownMap`.
- `pickTownMap` is deterministic.
- Building extraction returns candidates for bundled maps.
- Candidate centroids stay inside image bounds.
- POI assignment is deterministic.
- POI assignment avoids duplicate buildings.
- Existing placed POIs are not moved.
- Town export/import preserves image-backed maps.

## Non-Goals

- No generated roads.
- No generated walls.
- No generated building footprints.
- No generated schematic layouts.
- No clickable building polygons yet.

## Success Criteria

- POI markers land on real buildings.
- The town image defines the visual layout.
- Different maps look meaningfully different.
- No tic-tac-toe grid appears in normal operation.
