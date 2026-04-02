# Realm Keeper

A local-first Progressive Web App for Game Masters running living sandbox worlds. Built for iPad (works anywhere), fully offline, no account or backend required.

Currently Supports Cairn Rpg and Shadowdark. 

## Why This Exists

Running an open-world TTRPG campaign means tracking dozens of moving parts — factions scheming, NPCs with motives, weather, time, dungeons, rumors, relationships — all while staying present at the table. Existing tools either lock your data behind servers, require internet, or aren't designed for the GM-as-referee workflow.

Realm Keeper keeps everything local (your data, your device, your game), advances time through a watch-based calendar that triggers faction turns and weather rolls, and lets the GM confirm every suggested change before it hits the world. It ships with full compendium support for Cairn 2e and Shadowdark, and is designed to be system-agnostic so any OSR or indie game fits.

## Features

- **Realm & Region management** — Create multiple game worlds, divide into regions, place POIs and travel paths
- **NPC system** — Universal NPC model (traits, motivation, appearance, voice) with pluggable game-specific stats
- **Faction engine** — Relationship scores (-6 to +6) between every faction pair; automated faction turn suggestions the GM approves
- **Clock-driven world** — Year/Season/Day/Watch calendar; advancing time triggers weather rolls and faction turns
- **Dungeon generator** — Procedural dungeons with themed rooms, encounters, treasure, ecology, history, and NPC inhabitants; seeded for reproducibility
- **Random table engine** — Custom dice tables, table chains, roll history, fuzzy search
- **Compendium browser** — Built-in Cairn 2e and Shadowdark monsters, spells, magic items, and equipment
- **Realm notes** — Hierarchical Markdown notes attached to the world, regions, NPCs, and factions
- **Maps** — Place POIs on region maps with MapLibre GL
- **Rumors & notices** — Bounties, jobs, warnings for the session board
- **Export / Import** — Full JSON backup of any realm; no lock-in
- **PWA / installable** — Works offline, installable on iOS, Android, or desktop

## Getting Started

**Prerequisites:** Node.js 20+ and pnpm

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Preview production build locally
pnpm preview
```

## Tech Stack

| Layer     | Tool                                    |
| --------- | --------------------------------------- |
| Framework | TanStack Start (Vite + React 19)        |
| Language  | TypeScript (strict)                     |
| Storage   | Dexie.js (IndexedDB — no server)        |
| UI state  | Zustand                                 |
| Styling   | Tailwind CSS v4 + Radix UI primitives   |
| Rich text | Tiptap + react-markdown + remark-gfm    |
| Maps      | MapLibre GL                             |
| IDs       | ULID (sortable, no server coordination) |
| PWA       | vite-plugin-pwa                         |

## Architecture

Clean/Hexagonal architecture with strict layer separation:

```
Routes & Components  →  Application Use-Cases  →  Domain (Entities + Services)  →  Infrastructure (Dexie repositories)
```

- **74 use cases** orchestrate all business logic
- **22 domain entities** (Realm, Region, NPC, Faction, POI, WorldEvent, etc.)
- **Repository pattern** — Dexie implementations satisfy typed interfaces; swap storage without touching domain logic
- **GM confirms everything** — The engine suggests; the GM decides. No world state auto-commits

## Recent Changes

### Dungeon Generation

Full procedural dungeon generator ported and extended from hexbinder:

- `GenerateDungeon` use case — themed blueprints (tomb, cave, temple, mine, fortress, lair, crypt, etc.)
- `DungeonLayoutEngine` + `SpatialDungeonRenderer` — grid-based room placement with visual output
- `BlueprintEngine` + `DungeonBlueprints` — archetype-driven dungeon structure
- Ecology, history, and NPC generators for living dungeon flavor
- Seeded random — reproducible generation lets GMs revisit without re-rolling
- Compendium links — encounters link directly to monster, spell, and magic item entries

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Issues live in `.beads/issues.jsonl`.

```bash
bd ready          # find unblocked work
bd show <id>      # view issue details
bd prime          # full workflow context
```
