# User Feedback Implementation Plan

Feedback received 2026-04-18. Seven items: two confirmed bugs, two content gaps, three new features.

---

## Priority Order

| # | Item | Type | Effort |
|---|------|------|--------|
| 1 | Region terrain bug | Bug | XS |
| 2 | Missing Cairn People & Landmarks | Content | S |
| 3 | Dungeon icon differentiation | Feature | S |
| 4 | Calendar improvements | Feature | M |
| 5 | Compendium controls | Feature | M |
| 6 | Forest seed generator | Feature | L |
| 7 | Dungeon map editing | Feature | XL |

---

## 1. Region Terrain Bug (Bug — XS)

**File:** `src/application/use-cases/GenerateRegion.ts` lines 176–178

**Problem:** `terrainCategory` is hardcoded by difficulty, not by the terrain actually rolled:
```ts
const terrainCategory = difficulty === 'easy' ? 'plains'
  : difficulty === 'tough' ? 'forest'
  : 'mountain'
```
This means Hills, Swamp, Desert, Coast, Tundra etc. never appear as stored terrain — the generator rolls the right table but then discards the result.

**Fix:** Map the rolled `terrain` text to the correct category, or derive the category from the rolled terrain name directly. The terrain string is already in scope as `terrain` (the rolled result). A lookup map is cleanest:

```ts
const TERRAIN_CATEGORY_MAP: Record<string, Region['terrain']> = {
  'Plains': 'plains', 'Grasslands': 'plains', 'Farmland': 'plains', 'Coast': 'plains',
  'Forest': 'forest', 'Jungle': 'forest', 'Wetlands': 'forest', 'Swamp': 'forest',
  'Hills': 'mountain', 'Mountains': 'mountain', 'Desert': 'mountain', 'Tundra': 'mountain',
  'Badlands': 'mountain', 'Volcanic': 'mountain',
}
const terrainCategory = TERRAIN_CATEGORY_MAP[terrain] ?? 'plains'
```

Verify the actual terrain names used in the random tables and adjust the map accordingly.

---

## 2. Missing Cairn People & Landmarks Content (Content — S)

**Problem:** The Cairn 2e system config is missing two setting-seed categories: People and Landmarks/Topography. These appear in Cairn's Forest Seeds and Setting Seeds rules and are expected in the region builder.

**Approach:**
- Locate `src/data/systemConfigs/cairn.ts` (or equivalent)
- Add People tables: typical archetypes found in a region (Foragers, Pilgrims, Hunters, Merchants, Refugees, Scholars, Cultists, Soldiers, etc.)
- Add Landmarks / Topography tables: distinctive features (Ancient ruins, Standing stones, Collapsed bridge, Overgrown shrine, Charred clearing, Flooded village, Witch's cottage, etc.)
- Wire both into the region generator output so they appear in generated region descriptions

**Files to touch:**
- `src/data/systemConfigs/cairn.ts` — add table entries
- `src/application/use-cases/GenerateRegion.ts` — roll and include People + Landmarks in region output
- `src/domain/entities/Region.ts` — add `people` and `landmarks` fields if not present

---

## 3. Dungeon Icon Differentiation (Feature — S)

**Problem:** `SpatialDungeonRenderer.tsx` uses a flat `ROOM_SYMBOLS` map with no distinction between a room containing a talkable NPC (denizen) vs a hostile creature (monster). Both show the same icon.

**Current state:**
```ts
const ROOM_SYMBOLS = {
  entrance: '⛩', exit: '🚪', corridor: '→', chamber: '□',
  shrine: '✦', treasury: '◈', prison: '⚿', lair: '☠', trap_room: '⚠'
}
```

**Approach:**
- Add `denizen` and `creature` as room types (or as a property on existing room types)
- Assign distinct icons: e.g. `denizen: '🗣'` (or `'👤'`), `creature: '👹'` (or `'☠'` moved here, freeing `lair` for an empty lair)
- Update the dungeon domain entity (`DungeonRoom`) to support a `occupantType: 'denizen' | 'creature' | 'none'` field
- Render logic in `SpatialDungeonRenderer.tsx` should pick the icon based on `occupantType` override, falling back to `roomType` symbol
- Update dungeon generator to set `occupantType` when placing NPCs vs monsters

**Files to touch:**
- `src/domain/entities/Dungeon.ts` (or `DungeonRoom.ts`) — add `occupantType`
- `src/components/dungeon/SpatialDungeonRenderer.tsx` — extend `ROOM_SYMBOLS`, update render logic
- `src/application/use-cases/GenerateDungeon.ts` — assign `occupantType` during generation

---

## 4. Calendar Improvements (Feature — M)

**Feedback:** Calendar should connect to game events; weather and seasons should be editable.

**Approach:**

### 4a — Connect calendar to WorldEvents
- Show a dot/badge on days that have WorldEvents
- Clicking a day opens a side panel listing events on that date
- New events can be created from the calendar day view

### 4b — Editable weather
- Weather entries in the calendar sidebar should have an edit button
- Opens an inline form to change `condition`, `temperature`, `wind`
- Saves to `db.weatherHistory`

### 4c — Editable seasons
- WorldDate has a Season field; seasons currently come from SystemConfig
- Add a "Season settings" panel per Realm to rename seasons and set their day ranges
- Store overrides in `db.worlds` (or a new `realmSettings` table)

**Files to touch:**
- `src/components/calendar/` — calendar day cell, event list panel
- `src/application/use-cases/` — UpdateWeather use case
- `src/domain/entities/World.ts` — add optional `seasonOverrides` field
- `src/infrastructure/dexie/repositories/WeatherHistoryRepository.ts`

---

## 5. Compendium Controls (Feature — M)

**Feedback:** GMs want to disable or edit base compendium entries (e.g. hide a monster they've reskinned, edit a spell description).

**Approach:**
- Compendium entries are currently read from static `systemConfigs`
- Add an `entityNotes`-style override table (`customCompendiumEntries`) — already exists in db schema (v33)
- Extend the UI with per-entry controls: **Hide** (sets `hidden: true`) and **Edit** (opens Markdown editor, saves override)
- Compendium queries merge static entries + overrides, with overrides winning
- A "Show hidden" toggle reveals suppressed entries with a restore option

**Files to touch:**
- `src/infrastructure/dexie/repositories/CustomCompendiumEntryRepository.ts` — `hide()`, `override()`, `restore()`
- `src/components/compendium/CompendiumEntry.tsx` — add hide/edit controls
- `src/ui/hooks/useCompendium.ts` — merge static + overrides

---

## 6. Forest Seed Generator (Feature — L)

**Feedback:** Add a Cairn-style Forest Seed generator.

**Cairn Forest Seeds rules summary:**
- Roll Name (adjective + noun)
- Roll Ruination (what happened here)
- Roll 3× Denizens
- Roll 3× Discoveries
- Roll Faction (who has a stake here)
- Roll Landmarks from the Setting Seeds Topography table
- Roll Spells found here

**Approach:**
- Add Forest Seed tables to `cairn.ts` systemConfig: Name Adjectives, Name Nouns, Ruinations, Denizens, Discoveries
- Create `GenerateForestSeed` use case that rolls all tables and returns a structured `ForestSeed` object
- `ForestSeed` can either be a standalone entity or map to a Region + child POIs
- Add UI: "Generate Forest" button in Regions list, result shown in a modal with "Accept as Region" action
- "Accept as Region" creates a Region with the rolled terrain, adds POIs for Discoveries and Landmarks, adds NPCs for Denizens

**New files:**
- `src/domain/entities/ForestSeed.ts`
- `src/application/use-cases/GenerateForestSeed.ts`
- `src/components/region/ForestSeedModal.tsx`

---

## 7. Dungeon Map Editing (Feature — XL)

**Feedback:** Allow adding/removing rooms and changing hallway connections directly on the dungeon map.

**Current state:** `SpatialDungeonRenderer.tsx` is a read-only SVG renderer. Rooms are positioned by a layout algorithm. No edit interactions exist.

**Approach (phased):**

### Phase A — Room management
- Click empty space on map → "Add Room" popover (choose type, name)
- Click existing room → sidebar with room detail + "Delete Room" button
- Deleting a room removes it and any connections to it

### Phase B — Connection editing
- Click a connection line → highlight it, show "Remove connection" button
- "Connect rooms" mode: click Room A, then Room B → creates a corridor between them
- Connection type toggle: open passage vs locked door vs secret door

### Phase C — Free positioning
- Drag rooms to reposition them (currently layout is auto-calculated)
- Persist `x, y` overrides on each `DungeonRoom`

**Implementation notes:**
- SVG interaction needs pointer event handlers on room nodes and connection paths
- Room positions need to be stored (currently calculated on render); add `position?: {x: number, y: number}` to `DungeonRoom`
- Use Zustand for transient edit state (selected room, mode)
- Each edit creates a use case call that persists immediately (no separate save button)

**Files to touch:**
- `src/domain/entities/Dungeon.ts` — add `position` to `DungeonRoom`
- `src/components/dungeon/SpatialDungeonRenderer.tsx` — add interaction layer
- `src/components/dungeon/DungeonRoomDetail.tsx` — room editing sidebar
- `src/application/use-cases/UpdateDungeonRoom.ts` (new)
- `src/application/use-cases/AddDungeonRoom.ts` (new)
- `src/application/use-cases/RemoveDungeonRoom.ts` (new)
- `src/application/use-cases/UpdateDungeonConnection.ts` (new)

---

## Implementation Order

Start with the bug fix (terrain) — it's a 5-minute code change with high user-visible impact. Then content gaps (Cairn People + Landmarks) before features. Features in order of effort: icons → calendar → compendium → forest seeds → map editing.

Terrain fix and Cairn content can ship in the same PR. Each feature after that should be its own PR.
