# Realm Keeper — Data Import via Dev API

Import factions, NPCs, POIs, and regions into Realm Keeper from markdown notes using the Chrome MCP browser automation tools.

## Prerequisites

- Realm Keeper dev server running (`npm run dev`)
- Chrome MCP tab open to the app (localhost:3000)
- `window.__realmKeeper` available (auto-installed in dev mode)

## Workflow

1. Get Chrome MCP tab context (`tabs_context_mcp`)
2. Verify API is available:
   ```js
   typeof window.__realmKeeper !== 'undefined'
   ```
3. Get active world ID:
   ```js
   window.__realmKeeper.worlds.activeWorldId()
   ```
4. List existing data to avoid duplicates:
   ```js
   await window.__realmKeeper.factions.list()
   await window.__realmKeeper.regions.list()
   ```
5. Create entities via `add()` calls
6. Link entities (set factionId on NPCs, etc.)

## API Reference

All methods return Promises (use `await`). `worldId` defaults to active world when omitted.

### worlds
| Method | Args | Returns |
|--------|------|---------|
| `worlds.list()` | — | `[{id, name}]` |
| `worlds.get(id)` | id: string | Realm |
| `worlds.activeWorldId()` | — | string \| null (sync) |

### factions
| Method | Args | Returns |
|--------|------|---------|
| `factions.list(worldId?)` | worldId?: string | Faction[] |
| `factions.get(id)` | id: string | Faction |
| `factions.add(data)` | `{worldId, name, ...}` | Faction |
| `factions.update(id, partial)` | id, partial fields | Faction |

**Required fields for add:** `worldId`, `name`

Optional: `description`, `type`, `status` ('active'\|'dormant'\|'disbanded'\|'destroyed'), `isParty`, `regionId`, `headquartersPoiId`, `leaderNpcId`, `agentNpcIds[]`, `agendaGoals[]`, `advantages[]`, `obstacles[]`, `traits[]`, `sortOrder`

### npcs
| Method | Args | Returns |
|--------|------|---------|
| `npcs.list(worldId?)` | worldId?: string | NPC[] |
| `npcs.get(id)` | id: string | NPC |
| `npcs.add(data)` | `{worldId, name, ...}` | NPC |
| `npcs.update(id, partial)` | id, partial fields | NPC |

**Required fields for add:** `worldId`, `name`

Optional: `race` ('human'\|'elf'\|'dwarf'\|'halfling'\|'half-orc'\|'half-elf'\|'goblin'\|'other'), `factionId`, `regionId`, `poiId`, `lifeStatus`, `movementStatus`, `description`, `traits[]`, `motivation`, `appearance`, `voice`, `want`, `tags[]`, `systemBlock`

### pois
| Method | Args | Returns |
|--------|------|---------|
| `pois.list(regionId?)` | regionId?: string | POI[] (defaults to active world) |
| `pois.listByWorld(worldId?)` | worldId?: string | POI[] |
| `pois.get(id)` | id: string | POI |
| `pois.add(data)` | `{regionId, name, ...}` | POI |
| `pois.update(id, partial)` | id, partial fields | POI |

**Required fields for add:** `regionId`, `name`

Optional: `parentPoiId`, `description`, `type` ('settlement'\|'building'\|'interior'\|'fortification'\|'dungeon'\|'natural'\|'landmark'\|'district'\|'zone'\|'ruin'\|'camp'\|'shrine'\|'other'), `subtypeLabel`, `floor`, `tags[]`, `readAloud`, `gmNotes`, `trouble`, `mood`, `sensory`, `services[]`

### regions
| Method | Args | Returns |
|--------|------|---------|
| `regions.list(worldId?)` | worldId?: string | Region[] |
| `regions.get(id)` | id: string | Region |
| `regions.add(data)` | `{worldId, name, ...}` | Region |
| `regions.update(id, partial)` | id, partial fields | Region |

**Required fields for add:** `worldId`, `name`

Optional: `description`, `terrain`, `features[]`, `dangers[]`, `settlements[]`, `resources[]`

### relationships
| Method | Args | Returns |
|--------|------|---------|
| `relationships.list(factionId)` | factionId: string | FactionRelationship[] |
| `relationships.get(fId, tId)` | factionId, targetId | FactionRelationship |
| `relationships.set(fId, tId, score, desc?)` | factionId, targetId, score (-6 to +6), eventDesc? | FactionRelationship |

## Faction AgendaGoal shape
```js
{ id: 'ulid', description: '...', completed: false, timeframe: 'immediate'|'long-term', progress: 0, segments: 4 }
```

## Advantage / Obstacle shape
```js
{ id: 'ulid', description: '...' }
```

## SystemBlock shape (for NPCs)
```js
{
  stats: [{key: 'STR', value: 10}],
  hp: 4, maxHp: 4, armor: 0,
  attacks: [{name: 'Dagger', damage: '1d6', description: ''}],
  inventory: [{name: 'Rope', slots: 1, description: ''}],
  abilities: [], notes: ''
}
```

## Example: Import a faction with key members

```js
const rk = window.__realmKeeper
const worldId = rk.worlds.activeWorldId()

// Create faction
const faction = await rk.factions.add({
  worldId,
  name: 'The Iron Syndicate',
  description: 'Criminal organization controlling trade routes',
  type: 'criminal',
  traits: ['ruthless', 'wealthy', 'secretive'],
})

// Create key NPC and link to faction
const npc = await rk.npcs.add({
  worldId,
  name: 'Kira Blackthorn',
  description: 'Syndicate boss',
  factionId: faction.id,
  traits: ['cunning', 'paranoid'],
  motivation: 'Expand territory',
})

// Set as faction leader
await rk.factions.update(faction.id, { leaderNpcId: npc.id })
```

## Tips

- **No delete operations** — safety measure. Remove entities through the UI.
- **Partial updates** — `update()` spreads partial onto existing, auto-bumps `updatedAt`.
- **Dexie live queries** — UI refreshes instantly when data changes, no reload needed.
- **IDs** — auto-generated ULIDs. Store returned `.id` for linking entities.
- **Batch operations** — run multiple `add()` calls sequentially; each returns the created entity for chaining.
- **Regions required for POIs** — get region ID first via `regions.list()`, or create one.

## Markdown Parsing Guidance

When user provides markdown notes about factions/NPCs:
1. Parse faction names, descriptions, types from headings/content
2. Identify key members → create as NPCs, link via `factionId`
3. Set leader via `factions.update(id, {leaderNpcId: npcId})`
4. Map traits, goals, advantages, obstacles from bullet points
5. For `agendaGoals`, `advantages`, `obstacles` — generate ULID for each `.id` field (use `crypto.randomUUID()` in browser as quick alternative)
