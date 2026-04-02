# Claude Realm Builder Plan

## Vision

Claude Code is the primary tool for building and populating realms. All interaction happens from the terminal — no in-app AI chat. The workflow is collaborative: the GM describes ideas, hands Claude source material, and Claude builds it out incrementally using the `window.__realmKeeper` API via Chrome MCP.

Two main modes:

1. **Module Import** — Hand Claude a plain-text adventure module. Claude parses it and creates all entities (regions, POIs, NPCs, dungeons, factions, notes, rumors, magic items, equipment) directly into the live app.

2. **Collaborative World Building** — Brainstorm a realm concept in conversation. Claude builds it out layer by layer, using the dungeon generator, NPC generator, and compendium tools. ("Let's add a dungeon under that tavern" → Claude generates it and populates the rooms.)

The goal is a smooth harness where Claude always knows the current state of the world, understands the active game system's rules, and has all the tools it needs without the GM having to explain context every session.

---

## Current State

`window.__realmKeeper` is installed on the browser window via `src/infrastructure/dev/devApi.ts`. It covers raw CRUD for:

- `worlds` — list, get, activeWorldId
- `factions` — list, get, add, update, delete
- `npcs` — list, get, add, update, delete
- `pois` — list, get, add, update, listChildren, delete (cascading), deleteChildren
- `regions` — list, get, add, update
- `relationships` — list, get, set
- `compendium` — list, listByKind, get, add, update (custom compendium entries)

---

## Gaps to Fill

### 1. Missing API Namespaces

These tables exist in the DB but have no surface in `window.__realmKeeper`:

| Namespace | Why needed |
|---|---|
| `realmNotes` | Lore pages, faction histories, world background from modules |
| `worldEvents` | Log what Claude created; set adventure starting date |
| `rumors` | Adventure modules are full of leads and gossip |
| `notices` | Posted notices, wanted posters, quest boards |
| `poiEvents` | Active events/encounters at a location |
| `paths` | Travel connections between POIs — modules always imply these |
| `encounterTables` | Region/dungeon random encounter tables |
| `clock` | Read and set the world date (year/season/day) |

### 2. Custom Magic Items and Equipment

The existing `compendium` namespace handles custom entries but Claude needs clear affordances for creating game-system-appropriate magic items and equipment:

```ts
window.__realmKeeper.compendium.addMagicItem(worldId, data)
window.__realmKeeper.compendium.addEquipment(worldId, data)
window.__realmKeeper.compendium.addMonster(worldId, data)
window.__realmKeeper.compendium.addSpell(worldId, data)
```

These should validate against the active system's schema (Cairn vs Shadowdark items have different fields) and attach to the world's custom compendium.

### 3. Snapshot / Context Call

Claude needs to read world state before making changes — to get existing IDs, avoid duplicates, understand what's already there.

```ts
window.__realmKeeper.snapshot()
// Returns: { realm, regions, factions, npcs, pois (top-level only), realmNotes (titles only) }
// Lightweight skeleton — no dungeon rooms, no event history

window.__realmKeeper.context()
// Same data formatted as a human-readable summary Claude can reason about directly
```

### 4. Dungeon Generation Hook

The app has a full dungeon generator (`src/lib/dungeon/DungeonGenerator.ts`) but it's not exposed. Claude should be able to trigger it:

```ts
window.__realmKeeper.dungeons.generate(parentPoiId, options)
// Runs DungeonGenerator with given options
// Saves all rooms as child POIs under parentPoiId
// Returns summary of what was generated
```

Options would mirror the existing `DungeonGenOptions` shape from the app. This is the key call for collaborative building — "add a dungeon under this tavern" is one line.

### 5. Bulk Helpers

Creating 30 rooms or 15 NPCs one call at a time is slow and fragile:

```ts
window.__realmKeeper.bulk.addNPCs(worldId, npcsArray)
window.__realmKeeper.bulk.addPOIs(regionId, poisArray)      // handles parentPoiId linking
window.__realmKeeper.bulk.addFactions(worldId, factionsArray)
window.__realmKeeper.bulk.addRumors(worldId, rumorsArray)
```

### 6. NPC Linking Convenience Methods

```ts
window.__realmKeeper.npcs.addToFaction(npcId, factionId)
window.__realmKeeper.npcs.placeAt(npcId, poiId)
```

---

## System-Aware Context (Game System Agents)

Claude needs to understand the active game system when creating content. A Cairn NPC has no class, uses weird items, death is common. A Shadowdark NPC has a class, spell slots, armor class. A Cairn magic item is a strange mundane object with a weird property. A Shadowdark magic item has charges and triggers.

### Approach: System Context Docs

Create a markdown doc per game system that Claude reads at the start of a realm session. These live in `docs/systems/`:

**`docs/systems/cairn-2e.md`**
- NPC creation guidelines (omens, traits, drive, bond)
- What makes a good Cairn magic item (weird, evocative, useful but limited)
- Monster design philosophy (avoid stat blocks, describe behavior)
- Faction design (small, human-scale, local interests)
- Example NPC, example magic item, example location seed

**`docs/systems/shadowdark.md`**
- NPC stat block fields (HP, AC, attacks, special abilities)
- Spell design guidelines
- Magic item creation (charges, attunement, curse possibilities)
- Monster CR-equivalent guidance
- Class-appropriate NPC archetypes
- Example stat block, example magic item

### How Claude Uses These

At the start of a session or import, Claude reads the system doc for the active realm's game system, then uses it to shape all generated content. "Create a magic sword for a Cairn realm" vs "Create a magic sword for a Shadowdark realm" produces meaningfully different results.

---

## Claude Code Skills

### `/realm-session` (start of any building session)

Invoke at the start of a work session. This skill:
1. Connects to the browser and calls `snapshot()` / `context()`
2. Detects the active realm's game system
3. Reads the appropriate system doc (`docs/systems/<system>.md`)
4. Outputs a summary: "You're working on [Realm Name], a [system] realm with X regions, Y factions, Z NPCs. Here's the current state..."
5. Claude is now ready to build without needing re-explanation

### `/realm-import` (adventure module import)

1. User pastes or attaches plain-text module
2. Claude runs `/realm-session` first (gets context)
3. Parses module: regions, POIs, NPCs, factions, dungeons, rumors, magic items, equipment, notes
4. Presents a manifest to the user ("I found 3 regions, 12 locations, 8 NPCs, 1 dungeon, 4 magic items — proceed?")
5. Executes in order: regions → factions → POIs → dungeons → NPCs → compendium items → rumors/notices → realmNotes
6. Logs a worldEvent summarizing the import
7. Reports what was created with IDs

### `/realm-build` (collaborative world building)

Ongoing session skill. After `/realm-session` loads context:
- GM describes ideas in plain language
- Claude proposes structure, asks clarifying questions, builds incrementally
- Uses `dungeons.generate()` when dungeons are mentioned
- Creates NPCs shaped by the system doc
- Wires factions and relationships
- Adds rumors and hooks pointing toward the adventure

---

## Future: Map Builder Integration

Out of scope for now but worth capturing:

- **Town/settlement maps** — Watabou MFCG integration already partially exists in the app. Drive it from the dev API: `window.__realmKeeper.maps.generateTown(poiId, options)`
- **Building interiors** — Watabou One Page Dungeon for individual buildings
- **Regional overview** — Some way to attach or generate a sketch map for a region

---

## Implementation Order

1. **Add missing namespaces** to `devApi.ts`: `realmNotes`, `worldEvents`, `rumors`, `notices`, `poiEvents`, `paths`, `clock`, explicit compendium item methods
2. **Add `snapshot()` and `context()`** — world state dump
3. **Expose dungeon generator** via `dungeons.generate()`
4. **Add bulk helpers**
5. **Add NPC linking helpers**
6. **Write `docs/systems/cairn-2e.md`** — Cairn-specific creation guidelines for Claude
7. **Write `docs/systems/shadowdark.md`** — Shadowdark-specific creation guidelines
8. **Write `docs/realm-builder-api.md`** — full API reference (shapes, examples, import order)
9. **Build `/realm-session` skill** — context loader
10. **Build `/realm-import` skill** — module import workflow
11. **Build `/realm-build` skill** — collaborative session wrapper
12. **Test end-to-end** with a real plain-text module and a from-scratch world build

---

## Open Questions

- Claude Code skills: confirm `.claude/commands/` directory structure and format
- The dev API is currently installed in all environments (dev + prod). This is correct — the import workflow needs to work on iPad too. Leave as-is.
- For `dungeons.generate()` — Claude passes a theme/size/flavor as natural language and the call translates to `DungeonGenOptions`, or Claude constructs the options object directly? Probably natural language → options translation is better UX.
- System docs: how opinionated should they be? Enough to guide Claude without being so long they eat too much context on every session start.
