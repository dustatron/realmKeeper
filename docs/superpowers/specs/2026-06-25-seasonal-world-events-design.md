# Seasonal world events — design (Slice A)

**Status:** designed, ready for implementation plan.
**Date:** 2026-06-25.
**Scope:** the first of three slices of a "living world events" feature. This
slice delivers the headline ask: a generated world has a **seasonal calendar of
celebrations** — every season has a few festivals/markets/ceremonies at
different settlements — and those events actually fire when the GM advances time.

Slices B (one-time dated events) and C (ongoing spawn on Advance Day) are
described under "Later slices" but are out of scope for this spec.

---

## Decisions (from brainstorming)

- Event **categories**: civic/celebrations, threats, natural, political (this
  slice ships **civic only**; the rest arrive in Slice B).
- **Volume**: per-settlement, plus a per-season coverage guarantee.
- **Recurrence**: recurring annual (this slice). One-time dated → Slice B.
- **Faction link**: where it fits (civic events are location-only, so no faction
  link in this slice).
- **Content source**: Cairn-flavored shared tables, matching the rest of worldgen.
- **Civic scaling**: by settlement size.
- **Seasonal spread**: each season has a few celebrations at *different*
  locations (target 2–4/season, scaled, floor of 2 when enough settlements).
- **Auto-fire**: fix the known bug so scheduled events activate + log on their
  trigger date (otherwise generated events sit inert).
- **Calendar display**: event types get distinct icon + color.

---

## Architecture — reuse the existing model

No new entity. A celebration is a **`POIEvent`** (already has everything):
- `poiId` — the settlement it happens at
- `type` — `'festival' | 'market' | 'ceremony'` (all exist in `POIEventType`)
- `trigger` — `{ year: null, season, day, watch: null }` (year:null = annual)
- `recurring: true`, `isActive: false`, `durationWatches`, `effects`, `tags`
- `name`, `description` — from Cairn-style event tables

When an event fires, a **`WorldEvent`** (`type: 'poi_event'`) is logged to the
timeline — the activation path that already exists in `executeAdvanceDay`.

### Components (small, isolated, testable)

1. **`src/domain/data/worldgen/eventFlavor.ts`** + a Cairn-style table module
   — celebration name/description pools per civic type, in the `cairnPick`
   pattern. Pure data + a `buildCivicFlavor(type, season, rng)` helper.
2. **`src/domain/services/worldgen/buildEvents.ts`** — pure, seeded. Input:
   settlement POIs (with `subtypeLabel` for size) + `rng`. Output: `POIEvent[]`
   of recurring civic events satisfying the per-settlement + per-season rules.
3. **`generateWorld.ts`** — compose `buildEvents` after settlements exist; its
   output joins the returned `poiEvents` (already persisted in the world
   transaction; `db.poiEvents` is already in the tx table list).
4. **`AdvanceClock.ts` + `calendar.tsx`** — wire `poiEventRepo` into the
   calendar advance deps and implement activation + expiry/re-arm (the bug fix).
5. **`src/components/calendar/eventTypeMeta.ts`** (or similar) — `POIEventType` →
   `{ icon, colorClass }`, consumed by the Scheduled Events list.

---

## Generation algorithm (`buildEvents`)

Settlement size from `subtypeLabel`, reusing buildSettlement's classification:
LARGE = City/Citadel/Fortress/Stronghold; SMALL = Hamlet/Outpost/Farmstead/…;
else medium.

**Step 1 — per-settlement civic events, scaled by size:**
- SMALL → 1 event (a `market`)
- medium → 2 (`market` + `festival`)
- LARGE → 3 (`market` + `festival` + `ceremony`)
Each event is assigned a season (seeded) and a day within that season, located
at that settlement, `recurring: true`, `year: null`.

**Step 2 — seasonal coverage guarantee:**
- Target per season = `clamp(round(settlementCount / 4), 2, 4)`, capped by the
  number of settlements (a season can't exceed distinct-settlement count).
- For each of the 4 seasons, if Step 1 produced fewer than the target *at
  distinct settlements*, add `festival` events at settlements not already
  celebrating that season until the target is met (or settlements run out).
- Guarantees: every season has ≥ min(target, settlementCount) celebrations at
  **different** locations.

Determinism: one `SeededRandom`, no `Date.now`/`Math.random` — same seed → same
calendar (consistent with all worldgen builders).

Edge cases: 0 settlements → no events (and no crash). 1 settlement → it gets its
size-scaled events; seasonal floor is capped by the single settlement.

---

## Auto-activation + expiry fix

`executeAdvanceDay` already scans inactive POIEvents, matches `trigger` to the
new date, sets `isActive: true`, and logs a `poi_event` WorldEvent — **but only
when `deps.poiEventRepo` is present, and the calendar never passes it.**

- Pass `poiEventRepo` into the calendar's advance + advance-week deps.
- **Expiry / re-arm:** when an active event's `trigger`-day + `durationWatches`
  has passed, set `isActive: false`. For recurring (`year: null`) events this
  re-arms them so they fire again on the same season/day next year. (The
  existing "deactivate expired" branch is a no-op stub — implement it.)
- A recurring annual event therefore cycles: inactive → fires on its date →
  active for `durationWatches` → inactive → fires again next year.

---

## Calendar display

`eventTypeMeta`: each `POIEventType` → a lucide icon + Tailwind color class
(e.g. festival = party-popper/amber, market = coins/green, ceremony =
sparkles/violet, disaster = flame/red, siege = swords/red, …). The Scheduled
Events list shows the icon + colored type label next to each event. Status badge
(active/upcoming/past) stays as-is.

---

## Testing (TDD)

- **`buildEvents` unit:** deterministic for a seed; every season covered at
  distinct settlements; per-settlement counts scale by size; all events
  `recurring` with `year: null`; 0- and 1-settlement edge cases.
- **`generateWorld` integration:** returned `poiEvents` include civic events;
  each season has ≥ floor; events located at real settlement POIs.
- **Advance-day activation/expiry:** advancing onto a trigger date activates the
  event + logs a WorldEvent; after `durationWatches` it deactivates; a recurring
  event re-fires the next year.

---

## Non-goals (this slice)

- Threats / political / natural events, one-time dated events, faction links
  (Slice B).
- Ongoing spawn on Advance Day and the events-density knob (Slice C).
- GM-confirm consequence flow for bad events (Slice B/C).

---

## Later slices (out of scope, for context)

- **Slice B — one-time dated events:** threats/political/natural in Year 1,
  spread across seasons, faction-linked where it fits; bad events emit
  GM-confirm suggestions (reusing the faction-turn suggestion→confirm pattern).
  Adds an "events density" knob to the Create dialog.
- **Slice C — ongoing spawning:** a per-day chance on Advance Day, tied to the
  density knob, reusing B's builders + confirm flow.

---

## Unresolved questions

1. Civic `durationWatches` — fixed at 1 watch, or a full day (= watchesPerDay)
   so a festival reads as "today" on the calendar?
2. Do markets recur annually like festivals, or would a weekly/seasonal market
   feel better (out of scope if it needs sub-season cadence)?
3. Exact per-season target formula — `clamp(round(settlements/4), 2, 4)` ok, or
   a flat "2–3 per season" regardless of size?
