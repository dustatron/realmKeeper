# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Realm Keeper — local-first PWA for GMs to run living sandbox worlds from iPad. System-agnostic, offline-only, no backend. Detailed plan in `plan/realm-keeper-plan-v4.docx`.

## Tech Stack

- **Framework:** TanStack Start (Vite-powered, type-safe routing)
- **Language:** TypeScript (strict mode)
- **Storage:** Dexie.js (IndexedDB) — no server, all data local
- **UI State:** Zustand (UI-only; Dexie handles persistence)
- **Styling:** Tailwind CSS + Radix primitives
- **Markdown:** react-markdown + remark-gfm (all text fields render Markdown)
- **PWA:** vite-plugin-pwa
- **IDs:** ULID (sortable, no server coordination)

## Architecture

### Core Patterns
- **Local-first:** All data in IndexedDB. Export/import as JSON. Zero API calls (except optional Phase 2 Claude API).
- **System-agnostic NPCs:** Universal NPC core (name, traits, motivation, connections) + pluggable **SystemBlock** with game-specific stats. SystemConfig defines what fields a SystemBlock contains per game system.
- **Clock-driven world:** WorldDate = Year/Season/Day/Watch. Advancing time triggers faction turns, weather rolls, event logging.
- **GM confirms everything:** App suggests changes; GM decides. Never auto-commit world state.
- **Event-driven:** All actions generate timestamped WorldEvents.

### Key Data Entities
- **SystemConfig** — per-game-system definition (ships with Cairn 2e + Shadowdark)
- **Realm** → references a SystemConfig
- **Region** → belongs to Realm
- **Faction** → has relationship scores (-6 to +6) with every other faction; agents are NPCs
- **NPC** → universal fields + SystemBlock; linked to faction/region
- **POI/Path** → points of interest with travel times
- **WorldEvent/WeatherHistory** — timeline logs

### Faction Turns
Clock advances → d6 roll per faction → auto-suggest relationship/status changes → GM confirms. Party faction never auto-rolls.

## Build Commands

**Use `pnpm`** — it is the single source of truth (Vercel deploys with `pnpm build`).
Do not use `npm`; there is no `package-lock.json` and adding one re-breaks CI.
```
pnpm install       # frozen-lockfile in CI — keep pnpm-lock.yaml in sync
pnpm dev           # Vite dev server (port 3000)
pnpm build         # production build (vite build && tsc --noEmit)
pnpm test          # vitest run
pnpm preview       # preview production build
```

## Git Workflow

**NEVER commit feature work directly to `main`.** Always create a feature branch first:

make sure you do `feature/` or `bugfix/` or `cleanup/` when creating branches

```bash
git checkout -b feature/short-description
# do the work
git push -u origin feature/short-description
# then open a PR
```

`main` is the stable branch. Direct commits to main are only acceptable for docs or config tweaks — never for code changes.

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Issues live in `.beads/issues.jsonl`.

```bash
bd ready                          # find unblocked work
bd show <id>                      # view issue details
bd create --title="..." --type=task --priority=2  # create issue
bd update <id> --status=in_progress  # claim work
bd close <id>                     # complete work
bd sync --from-main               # sync at session end
bd prime                          # full workflow context
```

## MVP Build Order

1. Scaffold (TanStack Start + Tailwind + Radix + Dexie + PWA)
2. SystemConfig definitions (Cairn + Shadowdark)
3. Dexie schema + seed tables
4. Random table engine
5. NPC system (universal + SystemBlock)
6. Realm/Region CRUD
7. Faction manager
8. Faction relationships
9. Party faction + NPC linking
10. Faction turns (d6, suggestions, GM confirm)
11. Calendar (watch-based time, weather, events)
12. Faction turn triggers
13. Realm Notes (Markdown main + sub-pages)
14. Dashboard / session view
15. POI & Path list
16. Data export/import (JSON)
17. PWA polish
