# Claude Realm Builder Plan

## Vision

Claude Code is the primary tool for building and populating realms. All interaction happens from the terminal — no in-app AI chat. The workflow is collaborative: the GM describes ideas, hands Claude source material, and Claude builds it out incrementally using the `window.__realmKeeper` API via Chrome MCP.

Two main modes:

1. **Module Import** — Hand Claude a plain-text adventure module. Claude parses it and creates all entities (regions, POIs, NPCs, dungeons, factions, notes, rumors, magic items, equipment) directly into the live app.

2. **Collaborative World Building** — Brainstorm a realm concept in conversation. Claude builds it out layer by layer, using the dungeon generator, NPC generator, and compendium tools. ("Let's add a dungeon under that tavern" → Claude generates it and populates the rooms.)

The goal is a smooth harness where Claude always knows the current state of the world, understands the active game system's rules, and has all the tools it needs without the GM having to explain context every session.

---

## What a Session Actually Looks Like

### Module Import Session
1. GM opens Claude Code in the terminal with the app running in Chrome
2. Runs `/realm-session` → Claude loads world state, detects system (e.g. Shadowdark), invokes the Shadowdark specialist agent for content rules
3. GM pastes or attaches a plain-text adventure module (e.g. a converted PDF)
4. Runs `/realm-import` → Claude reads the module, presents a manifest:
   > "I found 2 regions (Thornwood, The Sunken Fens), 14 locations, 9 NPCs, 1 dungeon (The Hollow Spire, 22 rooms), 3 factions, 6 magic items, 12 rumors. Proceed?"
5. GM confirms → Claude builds it all, logging a worldEvent for the import
6. GM sees everything appear live in the app (Dexie live queries, no reload)

### Collaborative Build Session
1. `/realm-session` → Claude is oriented
2. GM: *"Let's build a small frontier town on the edge of an ancient forest. Settlers vs. something in the woods."*
3. Claude proposes: 2 regions, 5 POIs, 3 factions, central tension hook
4. GM: *"Yeah, and let's put a dungeon under the tavern — old cellar that goes deeper than it should."*
5. Claude calls `dungeons.generate(tavernPoiId, { theme: 'ancient buried ruin', size: 'small', rooms: 8 })` → 8 rooms created as child POIs, already visible in app
6. GM: *"The innkeeper knows something. Make him nervous, tied to the Thornwood faction."*
7. Claude creates the NPC with Shadowdark-appropriate stats, links to faction, places at the tavern POI
8. Continue as long as needed — Claude tracks what it's created and can reference it throughout the session

The key property: **Claude never needs re-explaining**. The world state, system rules, and prior work are all loaded at session start.

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

### What's Already Built

> ⚠️ **Reminder:** A comprehensive Shadowdark specialist agent already exists at `.claude/agents/shadowdark-specialist-agent.md`. Before writing any Shadowdark system doc from scratch, leverage this. It covers:
> - Full monster stat block structure and encounter balance guidelines
> - Monster level vs party level difficulty table (`estimateEncounterDifficulty`)
> - Default NPC/monster stats (AC, HP by HD, attack bonus by level)
> - 5E → Shadowdark conversion context (OSR philosophy, stat simplification, deadly-but-fair)
> - Spell tiers, penance costs, all core mechanics
> - Equipment tables (mounts, boats, armor)
> - Verified vs unverified mechanics clearly flagged
>
> The Shadowdark agent is the authoritative source for creating Shadowdark-appropriate content. Wire the `/realm-session` skill to invoke it automatically when the active realm's system is Shadowdark.

Two existing commands also cover much of the current workflow:
- `.claude/commands/realm-data.md` — full `window.__realmKeeper` API reference + import workflow
- `.claude/commands/realm-update.md` — read/update agent instructions

### What Still Needs to Be Built

**`docs/systems/cairn-2e.md`** — Nothing exists for Cairn yet. Needs:
- NPC creation guidelines (omens, traits, drive, bond — no stat blocks)
- What makes a good Cairn magic item (weird, evocative, useful but limited)
- Monster design philosophy (describe behavior, not stats)
- Faction design (small, human-scale, local interests)
- Example NPC, magic item, location seed

**Shadowdark gap:** The specialist agent is deep on rules but thin on *content creation guidance* for a GM building a world. A short addendum doc covering "how to design a Shadowdark dungeon faction" or "what makes a Shadowdark magic item feel right" would complement the rules agent.

### How Claude Uses These

At the start of a session, Claude reads the system doc (or invokes the specialist agent) for the active realm's game system, then uses it to shape all generated content. "Create a magic sword for a Cairn realm" vs "Create a magic sword for a Shadowdark realm" should produce meaningfully different results.

---

## Claude Code Skills

> **What already exists:**
> - `.claude/commands/realm-data.md` — covers the import workflow and full API reference
> - `.claude/commands/realm-update.md` — covers reading and updating existing data
> - `.claude/agents/shadowdark-specialist-agent.md` — Shadowdark rules and content creation authority
>
> The skills below extend and formalize these into a cohesive session workflow.

### `/realm-session` (start of any building session)

Does not exist yet. This is the missing piece that ties everything together:
1. Connects to the browser via Chrome MCP and calls `snapshot()` / `context()`
2. Detects the active realm's game system from the world record
3. Invokes the Shadowdark specialist agent if system = Shadowdark; reads Cairn doc if system = Cairn
4. Outputs a session brief: "You're working on [Realm Name] ([system]). X regions, Y factions, Z NPCs. Here's the current state..."
5. Claude is fully oriented — no re-explaining needed each session

### `/realm-import` (adventure module import)

Extend the existing `realm-data.md` command into a proper skill:
1. User pastes or attaches plain-text module
2. Claude runs the session context load first
3. Parses module: regions, POIs, NPCs, factions, dungeons, rumors, magic items, equipment, notes
4. Presents a manifest ("I found 3 regions, 12 locations, 8 NPCs, 1 dungeon, 4 magic items — proceed?")
5. Executes in order: regions → factions → POIs → dungeons → NPCs → compendium items → rumors/notices → realmNotes
6. Logs a worldEvent summarizing the import
7. Reports what was created with IDs

### `/realm-build` (collaborative world building)

Ongoing session skill for brainstorming + building:
- GM describes ideas in plain language
- Claude proposes structure, asks clarifying questions, builds incrementally
- Uses `dungeons.generate()` when dungeons are mentioned
- Creates NPCs shaped by the active system's rules (Shadowdark agent for stat blocks, Cairn doc for stat-less NPCs)
- Wires factions and relationships
- Adds rumors and hooks pointing toward adventure

---

## Future: Map Builder Integration

Out of scope for now but worth capturing:

- **Town/settlement maps** — Watabou MFCG integration already partially exists in the app. Drive it from the dev API: `window.__realmKeeper.maps.generateTown(poiId, options)`
- **Building interiors** — Watabou One Page Dungeon for individual buildings
- **Regional overview** — Some way to attach or generate a sketch map for a region

---

## Implementation Order

**Already done — do not rebuild:**
- `window.__realmKeeper` basic CRUD (`devApi.ts`)
- `.claude/commands/realm-data.md` — import command + full API reference
- `.claude/commands/realm-update.md` — update/read command
- `.claude/agents/shadowdark-specialist-agent.md` — Shadowdark rules + monster/item creation

**Remaining work:**
1. **Add missing namespaces** to `devApi.ts`: `realmNotes`, `worldEvents`, `rumors`, `notices`, `poiEvents`, `paths`, `clock`
2. **Add explicit compendium item methods**: `addMagicItem`, `addEquipment`, `addMonster`, `addSpell`
3. **Add `snapshot()` and `context()`** — lightweight world state dump for session start
4. **Expose dungeon generator** via `dungeons.generate(parentPoiId, options)`
5. **Add bulk helpers** — `bulk.addNPCs`, `bulk.addPOIs`, `bulk.addFactions`, `bulk.addRumors`
6. **Add NPC linking helpers** — `npcs.addToFaction`, `npcs.placeAt`
7. **Write `docs/systems/cairn-2e.md`** — Cairn creation guidelines (no stat blocks, weird items, behavior-first monsters)
8. **Build `/realm-session` skill** — context loader that auto-selects system agent
9. **Refine `/realm-import`** from the existing `realm-data.md` command into a proper skill with the manifest/confirm step
10. **Build `/realm-build` skill** — collaborative session wrapper
11. **Test end-to-end** with a real plain-text module and a from-scratch world build

---

## Open Questions

- **Skills directory:** Commands live in `.claude/commands/`. Confirm whether skills (like `/realm-session`) go there or in `.claude/skills/` — the existing `realm-data.md` and `realm-update.md` are already in `commands/`, so probably there.
- **Dev API in prod:** Currently installed unconditionally (dev + prod). This is intentional — the workflow needs to run against the live app, including on iPad. Leave as-is.
- **Dungeon generator options:** When GM says "add a small dungeon under this tavern," does Claude construct `DungeonGenOptions` directly, or does `/realm-build` translate natural language → options? Natural language → options is better UX but requires mapping logic in the skill.
- **Snapshot size:** How much data is too much to load at session start? For large realms (100+ POIs, 50+ NPCs) the snapshot could be expensive. May need a trimmed version that only loads names/IDs for orientation, with full detail fetched on demand.
- **Cairn doc format:** Should it mirror the Shadowdark agent (deep, with code examples) or be a shorter GM-facing creative guide? Probably shorter — Cairn has no stat blocks, so there's less mechanical detail to cover. Focus on tone, philosophy, and examples.
- **5E module conversion:** When a GM hands Claude a 5E module to import into a Shadowdark realm, the Shadowdark specialist agent already knows how to do the conversion (stat simplification, OSR philosophy, level scaling). The `/realm-import` skill should detect this case and invoke the agent before creating NPCs/monsters.
