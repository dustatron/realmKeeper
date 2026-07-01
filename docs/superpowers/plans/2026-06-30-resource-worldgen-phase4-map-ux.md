# Resource-Driven Worldgen — Phase 4: Map UX & Layers — Implementation Plan

> One branch → one PR. Renders the data P1–P3 generate but never drew.

**Goal:** Make the world visible. Draw **rivers + chokepoints**, give **natural sites** a distinct marker, color settlements by **wealth band**, draw **trade routes**, surface **resource icons** and a **treasure layer**, all behind a **toggleable layer control**. Pure data-prep is unit-tested; rendering is integrated into the existing maplibre `MapViewer`.

**Spec:** `docs/superpowers/specs/2026-06-30-resource-driven-worldgen-design.md` (Phase 4 of 6).

**Architecture:** `MapViewer.tsx` renders a maplibre map with z-ordered GeoJSON layers (biome fill → hand-drawn tiles → region fill/outline/labels → paths → DOM markers). New layers slot into that z-order. A pure `mapLayers.ts` builds the GeoJSON/marker data from `gameMap`/`pois`/`connections`/`npcs`; `MapViewer` consumes it. A layer-toggle UI (in `MapToolbar`/`InteractiveMap`) flips maplibre layer `visibility` + marker classes.

## Global constraints
- **Branch:** `feature/resource-worldgen-p4-map-ux` off `main`. One PR.
- pnpm wrapper broken → `node_modules/.bin/vitest run` / `tsc --noEmit` / `vite build`.
- No worldgen/schema changes — **render-only** (reads existing fields: `HexCell.river`/`chokepoint`/`elevation`, `POI.wealthBand`/`trade`/`treasure`/`magicItemRefs`, `Connection` `'supplies'`). No new Dexie version.
- `worldId` convention; commit per task.
- **Visual QA caveat:** rendering can't be verified headless — tsc/build/tests gate compile correctness; the user verifies pixels in-app on a newly generated realm.

## Layers (toggleable; default-on marked ✓)
- **Terrain** ✓ — existing biome fill + hand-drawn tiles.
- **Rivers** ✓ — blue overlay on `cell.river` hexes + chokepoint markers (ford/pass/bridge).
- **Regions/political** ✓ — existing region fill/outline/labels.
- **Roads** ✓ — existing path lines.
- **Trade** — `'supplies'` `Connection`s as thin dashed lines between settlements.
- **Wealth** — settlement markers tinted by `wealthBand` (destitute→rich ramp).
- **Resources** — small icon per settlement/natural-site showing `trade.produces`.
- **Treasure** — markers on POIs holding `treasure`/`magicItemRefs`.
- (Deferred: discovery fog, arcane/ley — fog is P4-optional, arcane is P5.)

## Files
**Created:**
- `src/lib/map/mapLayers.ts` + `.test.ts` — pure builders: `buildRiverGeoJSON(hexCells, pxToLngLat)`, `buildChokepointFeatures(...)`, `buildTradeRouteGeoJSON(connections, poiById)`, `buildTreasureMarkers(pois, npcs)`, `wealthBandColor(band)`, `resourceIconFor(produces)`.
- `src/components/map/MapLayerControl.tsx` — the layer-toggle UI (checklist/popover).
**Modified:**
- `src/components/map/MapViewer.tsx` — add river/chokepoint/trade/treasure/resource layers; wealth marker tint; honor a `layers` visibility prop.
- `src/components/map/InteractiveMap.tsx` — own layer-toggle state; render `MapLayerControl`; pass `layers` to `MapViewer`.
- `src/lib/hexmap/tileMapping.ts` or marker icon map — ensure `natural` POI type has a distinct icon/tile.

## Tasks

### Agent (parallel) — pure map data-prep
- [ ] `mapLayers.ts`: the pure builders above. River GeoJSON = line/fill features for `cell.river` hexes; chokepoints = point features tagged by kind; trade routes = lines between the two POIs of each `'supplies'` connection; treasure markers = points for POIs with non-empty `treasure`/`magicItemRefs` (+ optionally NPC-carried, if modeled); `wealthBandColor` = 5-stop ramp; `resourceIconFor` = produce→icon key.
- [ ] Tests: river features only for river cells; trade routes skip connections whose endpoints aren't both POIs on the map; treasure markers only for POIs with loot; wealthBandColor covers all 5 bands + null.
- [ ] Verify: vitest on `mapLayers.test.ts`.

### Integration (me)
- [ ] `MapViewer`: add a `layers: Record<LayerId, boolean>` prop (default all visible). Add the new sources/layers in correct z-order (rivers above terrain/below labels; trade dashed above roads; treasure/resource symbols near markers). Tint settlement markers by `wealthBand`. Gate each layer's `visibility` + marker rendering on `layers`.
- [ ] Natural sites: distinct marker icon (and a `natural` feature tile if available).
- [ ] `InteractiveMap` + `MapLayerControl`: toggle UI wired to `layers` state.
- [ ] `tsc` + full suite + `vite build` green.

## Acceptance
- Rivers + chokepoints render (blue) on newly generated realms; natural sites have a distinct marker; settlements read by wealth; trade routes, resource icons, and treasure layer toggle on/off via the control.
- Compile/tests/build green. (Pixel-level correctness verified by the user in-app.)

## Notes
- Render-only; existing realms show whatever data they already have (older realms lack river/wealth fields → those layers simply show nothing for them).
- Keep new layers cheap (GeoJSON sources updated via `setData`, images loaded once) — mirror the existing tile-image pattern.
- Discovery fog deferred (needs explored/unexplored styling pass); note in PR.
