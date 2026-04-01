# Realm Keeper

Local-first PWA for GMs to run living sandbox worlds from iPad. System-agnostic, offline-only, no backend.

## Tech Stack

- **TanStack Start** — Vite-powered, type-safe routing
- **TypeScript** — strict mode
- **Dexie.js** — IndexedDB, all data local
- **Zustand** — UI state
- **Tailwind CSS + Radix** — styling
- **vite-plugin-pwa** — PWA support

## Recent Changes

### Dungeon Generation (latest)

Added a full dungeon generator ported from hexbinder. Includes:

- `GenerateDungeon` use case with procedural room, encounter, and treasure generation
- `DungeonLayoutEngine` and `SpatialDungeonRenderer` for spatial room placement and visual display
- `BlueprintEngine` + `DungeonBlueprints` for themed dungeon archetypes
- Ecology, history, and NPC generators for living dungeon flavor
- Seeded random for reproducible results
- Compendium links for monsters, spells, and magic items within dungeon output

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```
