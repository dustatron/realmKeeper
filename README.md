# Realm Keeper

A local-first Progressive Web App for Game Masters running living sandbox worlds. Built for iPad (works anywhere), fully offline, no account or backend required.

**▶ Try it live:** [pointcrawler.dustatron.com](https://pointcrawler.dustatron.com/realms/maps/01KW6PXJQHJTAGKAXM5ZH9C32R) — an example generated realm. All data lives in your browser; generate your own world and it never leaves your device.

Currently supports **Cairn 2e** and **Shadowdark**, and is designed to be system-agnostic so any OSR or indie game fits.

## Why This Exists

Running an open-world TTRPG campaign means tracking dozens of moving parts — factions scheming, NPCs with motives, weather, time, dungeons, rumors, relationships — all while staying present at the table. Existing tools either lock your data behind servers, require internet, or aren't designed for the GM-as-referee workflow.

Realm Keeper keeps everything local (your data, your device, your game), advances time through a watch-based calendar that triggers faction turns and weather, and lets the GM confirm every suggested change before it hits the world. It can **generate an entire seeded sandbox in one click** — a hex map of regions, settlements, factions with rivalries, NPCs, dungeons, ruins, landmarks, and a web of treasure and rumors that point at real places — then hands the GM the reins.

## Generate a Whole World

Creating a realm can build a complete, internally-consistent sandbox from a single seed:

- **Hex map & regions** — biome-driven terrain divided into regions, with settlements, POIs, and travel paths between them.
- **Factions & rivalries** — factions with relationship scores (−6 to +6) toward every other faction, HQs, leaders, and agendas. Faction count auto-scales with map size (or set it yourself).
- **NPCs** — populated with traits, motivation, appearance, voice, and system-correct stat blocks.
- **Dungeons** — themed procedural dungeons (tomb, cave, temple, mine, fortress, lair, crypt…) with rooms, encounters, treasure, ecology, history, and inhabitants.
- **Ruins & landmarks** — ruins with a history and ordered mini-crawl areas (occupants resolved from the compendium), single-source loot, and a notable prize; landmarks with legend / truth / secret / interaction / quest-hook.
- **World treasure seeding** — magic items, treasure, and tier-scaled monsters scattered per region onto POIs and NPC inventories; every faction guarded a great item; high-value loot gets a guardian. Magic items are unique across a realm. Density is tunable (off / sparse / moderate / frequent) for treasure, magic, and monsters independently.
- **Discovery & rumor web** — rumors, notice-board postings, found notes, and NPC knowledge that point at the *real* items and locations seeded above. Each faction seeks a specific world item. The GM sees a "Points to:" answer key.
- **Region-flavored encounters** — each region's encounter table reflects its tier and its own monsters; sign/omen and discovery rolls link to real nearby POIs.

Everything is **seeded and reproducible** — the same seed rebuilds the same world.

## Features

- **Realm & Region management** — multiple game worlds, divided into regions, with POIs and travel paths
- **Procedural world generation** — one-click seeded sandbox (see above); regenerate any piece on demand
- **NPC system** — universal NPC model (traits, motivation, appearance, voice) with pluggable game-specific stats
- **Faction engine** — relationship scores between every faction pair; automated faction-turn suggestions the GM approves
- **Clock-driven world** — Year / Season / Day / Watch calendar with a moon cycle; advancing time triggers weather and faction turns
- **Dungeon, ruin & landmark generators** — reproducible, compendium-linked, full of GM-ready flavor
- **Treasure & discovery web** — seeded loot tied to leads, rumors, notices, and faction quests
- **Random table engine** — custom dice tables, table chains, roll history, fuzzy search
- **Compendium browser** — built-in Cairn 2e and Shadowdark monsters, spells, magic items, and equipment
- **Realm notes** — hierarchical Markdown notes attached to the world, regions, NPCs, and factions
- **Maps** — region hex maps with POI placement (MapLibre GL)
- **Rumors & notices** — bounties, jobs, warnings for the session board
- **Export / Import** — full JSON backup of any realm; no lock-in
- **PWA / installable** — works offline, installable on iOS, Android, or desktop

## Getting Started

**Prerequisites:** Node.js 20+ and pnpm

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Run tests
pnpm test

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

Clean / Hexagonal architecture with strict layer separation:

```
Routes & Components  →  Application Use-Cases  →  Domain (Entities + Services)  →  Infrastructure (Dexie repositories)
```

- **84 use cases** orchestrate all business logic
- **26 domain entities** (Realm, Region, NPC, Faction, POI, EncounterTable, Hook, WorldEvent, …)
- **Repository pattern** — Dexie implementations satisfy typed interfaces; swap storage without touching domain logic
- **Pure, seeded generators** — world-generation logic is deterministic and side-effect-free; IDs and persistence live in the use-case layer
- **GM confirms everything** — the engine suggests; the GM decides. No world state auto-commits

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Issues live in `.beads/issues.jsonl`.

```bash
bd ready          # find unblocked work
bd show <id>      # view issue details
bd prime          # full workflow context
```
