# Encounter System Redesign

**Date:** 2026-07-01
**Branch:** `feature/encounter-redesign`

## Problem

The travel-encounter cascade has six categories: `creature`, `signOmen`, `loss`,
`npc`, `discovery`, `treasure`. As a DM tool for bridging travel between
locations, three are wrong:

- **`loss`** is full of *environmental events* (sinkhole, blizzard, flash flood).
  In Cairn-style play, "loss" should mean **resource attrition** — rations spoil,
  gear breaks, a mount goes lame, time is lost.
- **`discovery`** surfaces random objects that feel arbitrary to "find" mid-travel.
- **`treasure`** is fine but thin, and leans on generic magic ("enchanted trinket").

There is also no sense of *what a creature or NPC is doing* at the moment of the
encounter, so results are static ("Wolf pack") rather than scenes ("Wolf pack —
feeding on a fresh kill").

## Category Model (new)

Six categories, ordered for the master roll:

1. `creature` — a wild agent. **+ activity roll.**
2. `signOmen` — foreshadowing / tracks / distant signs (keeps POI location matching).
3. `areaEffect` — **NEW.** Weather, terrain danger, traps, magical phenomena. Can
   *chain* into a creature/NPC follow-up.
4. `loss` — **REBUILT.** Resource attrition only.
5. `npc` — a person. **+ activity roll.**
6. `treasure` — **EXPANDED.** Coins, gems, gear, armor, weapons, consumables.
   System-agnostic, named generically. **No magic items.**

`discovery` is **removed.**

## Activity (secondary roll)

Two global constant tables — `CREATURE_ACTIVITIES`, `NPC_ACTIVITIES` — **not**
per-table editable (Decision A1). When a roll lands on `creature` or `npc`, a
second die rolls the matching activity and it is shown as an activity line with
its own re-roll button. Stored on the result as `activity` / `activityRoll`.

## Area Effect chaining (Decision B — auto-chain)

Some area effects flush out a creature or NPC. Flagged inline with a **token
suffix** the roller parses and strips from display (keeps the plain `string[]` +
textarea editor intact — Decision B):

- `{creature}` → auto-rolls a creature, stacked beneath.
- `{npc}` → auto-rolls an NPC.
- `{creature|npc}` → randomly picks one, then rolls it.
- No token → plain descriptive area effect.

The chained follow-up is a full roll (own reaction/activity/monster match) stored
on `result.chained`. If the target section is disabled/empty, chaining is skipped.

## Data Model

- `EncounterTable`: drop `discovery`, add `areaEffect: string[]`.
- `EncounterRollResult`: add `activity?: string`, `activityRoll?: number`,
  `chained?: EncounterRollResult | null`.
- `EncounterCategory` const: drop `discovery`, add `areaEffect`, reorder as above.

## Migration (Dexie v47 — Decision C, do all three)

For each `encounterTables` row:
- `areaEffect = existing loss` (old loss entries *are* area effects).
- `loss = ` reseeded resource-attrition defaults.
- If `discovery` non-empty → append custom section `"Discovery (archived)"`.
- Remove the `discovery` field.

Backfill helper lives in `migrations/v47-encounter-categories.ts` with a unit test.

## Region generation (`regionEncounter.ts`)

- `RegionEncounterContent`: drop `discovery`, add `areaEffect`.
- Rename `LOSS_BY_TIER` content → `AREA_EFFECT_BY_TIER` (its entries are hazards);
  add a new tiered `LOSS_BY_TIER` of real attrition.
- Keep notable-site logic feeding `signOmen`; drop the `discovery` output.
- Expand `TREASURE_BY_TIER` with gear/armor/weapons/consumables.

## UI

- `EncounterResultCards`: creature/NPC cards gain an **activity line + re-roll**;
  area-effect card renders its `chained` creature/NPC beneath, visually linked.
- `EncounterCascade` / `EncounterTableUI`: `Discovery` section removed, `Area
  Effect` section added; `CATEGORY_LABELS` and `SavePayload` types updated.
- Add `{ kind: 'rerollActivity' }` cascade action.

## Consumers to update (discovery → areaEffect in inline Pick types)

`usePOIActions.ts`, `GenericTemplate.tsx`, `BuildingTemplate.tsx`,
`DungeonTemplate.tsx`, `SettlementTemplate.tsx`, `regions_.$regionId.tsx`.

## Out of scope

- The big flat biome tables (swamp/desert/…) stay as-is — one terrain flavor
  section (Decision A on Q5).
- Ruin/dungeon "discovery" (`RuinSite.discovery`, `RuinGenerator`) is a **separate
  feature** and is untouched.
- Magic items.

## Testing

- New: token-parse + chaining, activity roll, migration v47.
- Update: `encounterCascade.test.ts`, `encounterCascade.location.test.ts`,
  `RollEncounter.sections.test.ts`, `regionEncounter.test.ts`,
  `RegenerateRegionEncounter.test.ts`, and any schema tests.
