# Worldgen UX Cleanup — follow-up PR

**Status:** deferred — circle back in a separate PR.
**Context:** captured during the procedural-world-generation work (stages 1–9 +
settlement/dungeon population). Generation now produces rich data; this is about
*where that data shows up* and a few rough edges, not new generation features.

---

## 1. NPC detail page — information architecture (primary)

**Problem:** related info is scattered across the NPC page, so it's not obvious
where to look. `Want` lives under **Identity**, but it's really a quest, so a GM
goes looking under Factions / Quests and doesn't find it.

Current layout (`src/routes/_app/realms/npcs_.$npcId.tsx`):
- **Identity** card: race, description, appearance, voice, location, motivation,
  **want**, traits, tags, status, disposition, stat block
- **Factions** card
- **Connections** card
- **Quests & Hooks** card

**Proposed cleanup (pick one):**
- Move **Want** out of Identity into the **Quests & Hooks** card, so everything
  "what this NPC needs from the party" is in one place.
- Or a single **Hooks** section merging Want + faction agenda + structured Hooks.

Keep Identity to physical/role facts (race, appearance, voice, location, stats).

## 2. Consistency of "where things live" across pages

Audit the three detail templates so the same kind of info is in the same place:
- NPC (`npcs_.$npcId.tsx`)
- POI / Settlement (`components/poi-templates/SettlementTemplate.tsx`)
- Dungeon (`components/poi-templates/DungeonTemplate.tsx`)

Examples of current inconsistency:
- POI flavor text is rendered from `readAloud`, **not** `description` — the
  generated `description` field is dead weight on POIs. Decide one field.
- Dungeon NPCs were hidden under a tab labeled "Details" (renamed to "Denizens"
  this round) — check other tabs for similarly vague labels.

## 3. Smaller rough edges noticed

- **Dungeon creature NPCs** have empty `appearance` / `traits` (only worldgen
  `buildNpc` NPCs get those). Either enrich creature NPCs or hide empty fields.
- **Settlement "notable resident"** at the settlement level vs building
  proprietors — slight redundancy; decide if the settlement-level resident is
  still wanted now that buildings have proprietors.
- **CI / build:** a "failing build" was reported but `npm run build`
  (`vite build && tsc --noEmit`) exits 0 locally and all tests pass. If CI is
  still red, find where the check diverges (no `.github` workflow in repo today).
- **Empty-field rendering:** generic NPC/POI fields that are blank still render a
  label in places — sweep for "Field: —" noise.

## 4. Not code — housekeeping

- Many throwaway **test realms** accumulated during verification (Faction
  Verify, Race Fix Check, Settlement Detail Check, Town Check, NPC Detail Check,
  …). Bulk-delete from the Realms page.
