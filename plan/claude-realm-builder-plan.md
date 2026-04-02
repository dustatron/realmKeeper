# Claude Realm Builder Plan

## Vision

Use Claude Code (with Chrome MCP) as an active collaborator for building and populating realms. Two main modes:

1. **Module Import** — Hand Claude a plain-text adventure module and it parses it and creates all the entities (regions, POIs, NPCs, dungeons, factions, notes, rumors) directly into the live app via `window.__realmKeeper`.

2. **Collaborative World Building** — Brainstorm a realm idea with Claude in conversation, and Claude builds it out incrementally, using the dungeon generator, NPC generator, and other tools as needed. ("Let's add a dungeon under that tavern" → Claude calls the generator and populates the rooms.)

---

## Current State

`window.__realmKeeper` is installed on the browser window via `src/infrastructure/dev/devApi.ts`. It covers raw CRUD for:

- `worlds` — list, get, activeWorldId
- `factions` — list, get, add, update, delete
- `npcs` — list, get, add, update, delete
- `pois` — list, get, add, update, listChildren, delete (cascading), deleteChildren
- `regions` — list, get, add, update
- `relationships` — list, get, set
- `compendium` — list, listByKind, get, add, update

---

## Gaps to Fill

### 1. Missing API Namespaces

These tables exist in the DB but have no surface in `window.__realmKeeper`:

| Namespace | Why needed for import |
|---|---|
| `realmNotes` | Lore pages, faction histories, world background from modules |
| `worldEvents` | Log what Claude created; set the adventure's starting date context |
| `rumors` | Adventure modules are full of these — hooks, gossip, leads |
| `notices` | Posted notices, wanted posters, quest boards |
| `poiEvents` | Active events/encounters at a location (e.g. "bandits camped here") |
| `paths` | Travel connections between POIs — modules often imply these |
| `encounterTables` | Region/dungeon-level random encounter tables from modules |

### 2. Snapshot / Context Call

Claude needs to read the world state before making changes — to check existing region IDs, avoid duplicate factions, understand what's already there.

```ts
window.__realmKeeper.snapshot()
// Returns: { worlds, regions, factions, npcs, pois (top-level only), realmNotes }
// Lightweight — no dungeon rooms, no history, just the skeleton
```

Also useful: `window.__realmKeeper.context()` — same as snapshot but formatted as a human-readable summary Claude can reason about.

### 3. Dungeon Generation Hook

The app has a full dungeon generator (`src/lib/dungeon/DungeonGenerator.ts`) but it's not exposed on the dev API. Claude should be able to:

```ts
window.__realmKeeper.dungeons.generate(parentPoiId, options)
// Runs DungeonGenerator with the given options, saves all rooms as child POIs
// Returns the generated dungeon summary
```

This is the key piece for collaborative world building — "add a dungeon under this tavern" becomes a single call.

### 4. Bulk Helpers

Creating 30 dungeon rooms or 15 NPCs as serial individual calls is slow and fragile. Need:

```ts
window.__realmKeeper.bulk.addNPCs(worldId, npcsArray)
window.__realmKeeper.bulk.addPOIs(regionId, poisArray)  // flat list, handles parentPoiId chaining
window.__realmKeeper.bulk.addFactions(worldId, factionsArray)
```

### 5. NPC ↔ Faction / POI Linking

Currently you create an NPC and a faction separately, then have to manually call `npcs.update()` to set `factionIds`. Convenience methods:

```ts
window.__realmKeeper.npcs.addToFaction(npcId, factionId)
window.__realmKeeper.npcs.placeAt(npcId, poiId)
```

### 6. Clock / World Date

Modules often establish a starting date or season. Need:

```ts
window.__realmKeeper.clock.get(worldId)       // { year, season, day }
window.__realmKeeper.clock.set(worldId, date) // set starting point
```

---

## Claude Code Skill

Build a `/realm-import` skill that Claude Code can invoke. The skill would:

1. Ask the user to paste or attach the plain-text module
2. Read `window.__realmKeeper.snapshot()` to get current world state
3. Parse the module and identify: regions, POIs, NPCs, factions, dungeons, rumors, notes
4. Present a summary to the user for confirmation ("I found 3 regions, 12 locations, 8 NPCs, 1 dungeon — proceed?")
5. Execute the imports in order: regions → factions → POIs → dungeons → NPCs → rumors/notices → realmNotes
6. Report what was created

The skill file would live at `.claude/skills/realm-import.md` (or wherever Claude Code skill files go).

**Skill also useful for:** collaborative building sessions — invoke it at the start of a session to give Claude full context about the active realm before brainstorming.

---

## Collaborative World Building Mode

The idea: describe a realm concept in plain language, and Claude builds it with you incrementally.

Example session:
> "Let's build a small frontier town on the edge of an ancient forest. There's tension between the settlers and something in the woods."

Claude would:
1. Propose a region structure (town region + forest region)
2. Suggest key POIs (inn, blacksmith, town hall, forest edge, ruins)
3. Ask GM input on what to flesh out
4. Generate dungeons where appropriate (`dungeons.generate()`)
5. Create key NPCs with motivations tied to the central tension
6. Wire up factions and relationships
7. Add rumors and notices that point toward adventure hooks

This requires the snapshot/context call to work well so Claude can reference what it just created when adding the next layer.

---

## Future: Map Builder Integration

Out of scope for now but worth capturing:

- **Town/settlement maps** — Watabou MFCG integration already exists in the app (partial). Would be good to drive it from the dev API.
- **Building interiors** — Watabou One Page Dungeon for individual buildings.
- **Regional maps** — Some way to set region boundaries or generate a sketch map.

These would ideally be callable from the dev API so Claude can say "generate a Watabou town for this settlement POI" and have it attached automatically.

---

## Implementation Order

1. **Add missing namespaces** to `devApi.ts`: `realmNotes`, `worldEvents`, `rumors`, `notices`, `poiEvents`, `paths`, `clock`
2. **Add `snapshot()`** — lightweight world state dump
3. **Expose dungeon generator** via `dungeons.generate()`
4. **Add bulk helpers**
5. **Add NPC linking convenience methods**
6. **Write `docs/realm-builder-api.md`** — reference doc for Claude explaining all available calls, data shapes, and how to structure a module import (this is what the importing Claude reads)
7. **Build the `/realm-import` skill**
8. **Test end-to-end** with a real plain-text module

---

## Open Questions

- Where do Claude Code skills live in this repo? Need to confirm the `.claude/` directory structure.
- Should the dev API be dev-only or available in production builds? Currently it's installed unconditionally. For the import workflow to work on iPad it needs to be in prod.
- For the dungeon generator call — does Claude specify room count/theme/size, or does it always use the existing `DungeonGenOptions` shape from the app?
