# Living World Events — design plan

**Status:** planned — follow-up feature, not yet started.
**Captured:** 2026-06-25, during the procedural-world-generation branch.
**Goal:** make the world feel alive over time — factions act on a schedule,
random good/bad events occur as days advance, and recurring civic events
(festivals, markets, ceremonies) live on the calendar with real locations.

---

## Motivation (from the request)

The world is generated rich but static after day 1. The GM wants:

1. **Faction agendas on the calendar** — each faction should have upcoming
   things it intends to *do* (a raid, a march, a ritual), dated and located.
2. **Random events, good and bad** — "goblins attack a town", "a faction hits
   a caravan", surfacing as time advances.
3. **Travel / discovery events** — things the party *comes across* at a place.
4. **Civic events** — festivals, celebrations, markets, ceremonies — recurring,
   tied to settlements.

All of these already have a home in the data model; this feature is mostly
**generation + scheduling + surfacing**, not new entities.

---

## What already exists (reuse, don't reinvent)

- **`WorldEvent`** — free-form `type: string`, dated (`year/season/day/watch`),
  `relatedEntityIds`, `title`, `description`. Surfaces in the calendar
  **Timeline** tab (the day log) and the dashboard "Recent Events".
- **`POIEvent`** — scheduled/located event: `poiId`, `type: POIEventType`,
  `trigger {year|null, season, day, watch|null}`, `recurring`,
  `durationWatches`, `isActive`, `effects`, `tags`. Surfaces in the calendar
  **Scheduled Events** tab. `year: null` + `recurring` = annual.
- **`POIEventType`** (`src/shared/constants.ts`): `festival, market, ceremony,
  disaster, siege, weather, migration, political, supernatural, custom`.
  Covers festivals/celebrations/markets and most attack flavors already.
- **`buildDoom.ts`** — the canonical template: builds one future-dated
  `WorldEvent` (faction-linked) **plus** a matching scheduled `POIEvent` at the
  faction HQ POI sharing the same trigger date, plus rumors/notices/hook.
- **`executeAdvanceDay`** (`AdvanceClock.ts`) — already scans inactive POIEvents,
  matches `trigger` against the new date, sets `isActive: true`, and logs a
  `WorldEvent` of `type: 'poi_event'`. Faction turns + weather already run here.
- **Faction model** — `agendaGoals` (`immediate` | `long-term`, with
  `progress`/`segments` clocks), HQ POI, relationships.

### 🚨 Bug to fix first (blocks everything)

`executeAdvanceDay` only runs its POIEvent activation block when
`deps.poiEventRepo` is present. The calendar's `advanceDeps`
(`calendar.tsx`) **omits `poiEventRepo`**, so scheduled POIEvents are **never
auto-activated on their trigger date** through the UI — activation is manual
today. Wiring `poiEventRepo` into the calendar's advance/advance-week deps is a
prerequisite; without it, none of the scheduling below surfaces automatically.
(Also: the "deactivate expired" branch in `executeAdvanceDay` is a no-op stub —
decide whether `durationWatches` should expire active events.)

---

## Proposed scope — three independent slices

Each slice is shippable on its own. Suggested order: **0 → 1 → 2 → 3**.

### Slice 0 — Auto-activation plumbing (bugfix + foundation)
- Pass `poiEventRepo` into the calendar advance deps so trigger-date POIEvents
  activate and log a WorldEvent automatically.
- Implement expiry: when an active, non-recurring POIEvent's
  `trigger + durationWatches` is past, set `isActive: false`. Recurring annual
  events (`year: null`) re-arm for next year instead of expiring permanently.
- Tests: advancing onto a trigger date activates + logs; advancing past expires;
  recurring re-arms.

### Slice 1 — Generated civic calendar (festivals, markets, ceremonies)
- During worldgen, give settlements recurring annual `POIEvent`s scaled by
  settlement size: a market (`market`), a seasonal festival (`festival`), maybe
  a ceremony (`ceremony`). `year: null`, `recurring: true`, located at the POI.
- Flavor from Cairn tables where possible (event name, what happens).
- New builder `buildCivicEvents.ts`, composed into `generateWorld.ts` like the
  other builders; pure + seeded. Output joins the existing `poiEvents` return.
- Tests: deterministic; every settlement above size N gets ≥1 recurring event;
  events are located and dated with `year: null`.

### Slice 2 — Faction agendas as scheduled actions
- Generalize the doom builder into a faction-action scheduler: a faction with a
  long-term goal schedules a future-dated action (raid/march/ritual) as a
  `WorldEvent` + located `POIEvent` (at HQ, a rival's POI, or a path/POI the
  goal targets). Doom becomes the highest-stakes instance of this.
- On a faction turn (`ConfirmFactionTurn`), a `success`/`major_success` may
  *schedule the next* action (advances the agenda onto the calendar) rather than
  only logging a past `faction_turn` WorldEvent. This is the "things they are
  going to do" the GM asked for.
- Keep GM-confirms-everything intact: scheduled actions are suggestions until
  the GM advances onto them; nothing auto-commits world state mid-turn.
- Tests: a scheduled faction action produces a paired WorldEvent + POIEvent with
  the same trigger date and correct `relatedEntityIds`; turn outcomes schedule.

### Slice 3 — Random events on time-advance (good and bad)
- On `executeAdvanceDay`, an event roll (probability tunable, e.g. by a
  "world volatility" knob) may spawn a random event at a real location: bad
  (`goblins raid <settlement>`, `<faction> ambushes a caravan on <path>`) or
  good (`a merchant caravan arrives`, `a wandering healer visits`).
- Random-event tables (system-agnostic, Cairn-flavored) → pick subject + place +
  good/bad valence. Output a located `POIEvent` (active immediately or near-term)
  + a `WorldEvent` log entry.
- Travel/discovery framing: events on `Path`s or POIs the party is near read as
  "things you come across". (Party location tracking is out of scope unless it
  already exists — otherwise events are world-wide and the GM narrates.)
- Tests: deterministic given a seed; roll gate respected; spawned events are
  located and logged; good vs bad both reachable.

---

## Surfacing (UI)

- **Calendar → Scheduled Events** already lists POIEvents with status
  (active/upcoming/past), location, and trigger date — civic + faction +
  scheduled-random events appear here for free once generated.
- **Calendar → Timeline** + **Dashboard "Recent Events"** already show
  WorldEvents — random + activated events appear here for free.
- Consider event `type` → icon/color in the calendar so festival vs disaster vs
  faction action are visually distinct (small follow-up, not blocking).
- POI detail page: show that POI's scheduled/active events (it has `getByPoiId`).

---

## Non-goals (YAGNI for v1)

- Party-position simulation / encounter resolution mechanics.
- Branching event chains / consequences beyond a single logged event.
- Cross-system event tables beyond the Cairn-flavored shared set already used.
- Auto-resolving faction actions without GM advancing time.

---

## Unresolved questions

1. Random-event frequency: fixed small daily chance, or driven by the existing
   "danger level" / a new "volatility" generation knob?
2. Should random bad events mutate faction relationships / goals, or only narrate
   (log) until the GM decides?
3. Civic events per settlement: cap at 1, or scale (market + festival + ceremony)
   by settlement size?
4. Faction scheduled actions — target location preference order: HQ, rival HQ,
   goal-referenced POI, or nearest contested region?
5. Expiry: should active located events auto-deactivate at
   `trigger + durationWatches`, or stay until the GM clears them?
6. Do we need party location at all for "events you come across", or is
   world-wide + GM narration enough for v1? (Is party position tracked today?)
