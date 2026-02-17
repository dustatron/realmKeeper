# Realm Keeper — Data Import via Dev API

Import factions, NPCs, POIs, regions, and custom compendium entries into Realm Keeper from markdown notes using the Chrome MCP browser automation tools.

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

Optional: `parentPoiId`, `description`, `type` ('settlement'\|'building'\|'interior'\|'fortification'\|'dungeon'\|'natural'\|'landmark'\|'district'\|'zone'\|'ruin'\|'camp'\|'shrine'\|'other'), `subtypeLabel`, `floor`, `tags[]`, `readAloud`, `gmNotes`, `trouble`, `mood`, `sensory`, `services[]`, `locationSeed`

### LocationSeed shape (for POIs)
```js
{
  // Constructed (ruins, dungeons, camps, fortifications)
  purpose: '...', creator: '...', entrance: '...', composition: '...', condition: '...', ruinCause: '...',
  // Natural (natural, landmark, shrine)
  ecology: '...', terrain: '...', hazards: '...', resources: '...',
  // Universal
  lore: '...', secret: '...'
}
```
Only include relevant fields for the POI type. All fields optional.

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

### compendium (custom entries)
| Method | Args | Returns |
|--------|------|---------|
| `compendium.list(worldId?)` | worldId?: string | CustomCompendiumEntry[] |
| `compendium.listByKind(kind, worldId?)` | kind, worldId? | CustomCompendiumEntry[] |
| `compendium.get(id)` | id: string | CustomCompendiumEntry |
| `compendium.add(data)` | `{worldId, name, kind, ...}` | CustomCompendiumEntry |
| `compendium.update(id, partial)` | id, partial fields | CustomCompendiumEntry |

**Required fields for add:** `worldId`, `name`, `kind` ('monster'\|'spell'\|'magicItem')

Optional: `description` (markdown), `monsterData`, `spellData`, `magicItemData` (include the one matching `kind`)

### MonsterData shape
```js
{ ac: 14, hp: 20, speed: '30 ft.', attacks: 'Claw d6, Bite d8', abilities: '**Multiattack.** ...', cr: '2' }
```
All fields optional. `ac` and `hp` are numbers or null. All others are strings. `abilities` supports markdown.

### SpellData shape
```js
{ level: '3rd', school: 'Evocation', castingTime: '1 action', range: '60 ft.', duration: 'Instantaneous', components: 'V, S, M', classes: ['Wizard', 'Sorcerer'] }
```

### MagicItemData shape
```js
{ rarity: 'Uncommon', itemType: 'Wondrous Item', attunement: true, charges: '3', properties: ['glowing', 'cursed'] }
```

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

## Example: Import custom bestiary entries

```js
const rk = window.__realmKeeper
const worldId = rk.worlds.activeWorldId()

// Create a custom monster
const monster = await rk.compendium.add({
  worldId,
  name: 'Kappa',
  kind: 'monster',
  description: 'A river-dwelling trickster spirit with a bowl-shaped head filled with water.',
  monsterData: {
    ac: 13, hp: 18, speed: '30 ft., swim 40 ft.',
    attacks: 'Claw d6, Bite d4',
    abilities: '**Water Bowl.** If the water in its head-bowl spills, the Kappa is paralyzed until refilled.\n\n**Grappler.** +2 to grapple attempts.',
    cr: '1',
  },
})

// Create a custom spell
await rk.compendium.add({
  worldId,
  name: 'Spirit Ward',
  kind: 'spell',
  description: 'Creates a protective circle that repels spirits.',
  spellData: {
    level: '2nd', school: 'Abjuration', castingTime: '1 action',
    range: '10 ft.', duration: '1 hour', components: 'V, S, M (salt)',
    classes: ['Cleric', 'Wizard'],
  },
})

// Create a custom magic item
await rk.compendium.add({
  worldId,
  name: 'Oni Mask',
  kind: 'magicItem',
  description: 'A lacquered demon mask that grants its wearer terrifying presence.',
  magicItemData: {
    rarity: 'Rare', itemType: 'Wondrous Item', attunement: true,
    charges: '3', properties: ['frightful presence', 'darkvision 60 ft.'],
  },
})
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

When user provides markdown notes about monsters/spells/magic items (bestiary, spell lists, etc.):
1. Determine `kind` from context (bestiary → 'monster', spell list → 'spell', item list → 'magicItem')
2. Parse stat blocks into `monsterData` / `spellData` / `magicItemData` fields
3. Use `description` for flavor text / lore (supports markdown)
4. Use `monsterData.abilities` for special abilities (supports markdown)
5. List existing entries first to avoid duplicates: `await rk.compendium.list()`
