# Advanced Encounter Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Hexbinder-style cascading encounter generator to the Encounters tab: roll a master table (the POI/region's editable categories) → roll the hit category's entries → enrich `npc`/`creature` results with a reaction roll and a generated NPC card / matched monster stat block, with per-table and global re-rolls, persisted on the encounter table.

**Architecture:** A pure cascade engine (`encounterCascade.ts`) takes resolved sections + injected effects and returns/updates an `EncounterRollResult`. NPC generation, monster matching, and persistence are bound in the action layer (`usePOIActions`) where `systemConfig`/`container` exist. The result is stored on `EncounterTable.lastResult`. The `EncounterCascade.tsx` component is dumb — it renders the result and calls callbacks. The existing `EncounterTableUI` editor is preserved as an "Edit tables" mode.

**Tech Stack:** TypeScript (strict), React, Dexie, Vitest, Tailwind.

## Global Constraints

- Use `pnpm` only (never `npm`).
- TypeScript strict mode — full `EncounterTable` literals must set new fields.
- Build = `pnpm build`; tests = `pnpm test`.
- Reaction = 2d6 mapped to `Disposition` (`'hostile' | 'wary' | 'curious' | 'kind' | 'helpful'`).
- Reuse, do not duplicate: `rollDice` (`@shared/dice`), `getActiveSections` (`RollEncounter.ts`), `executeGenerateNPC`, `getMonstersBySystemId`/`getMonsterStats`, `MonsterStatBlock`, `UpdateEncounterTable`/`CreateEncounterTable`.
- No terrain influence; no sensory section (out of scope for v1).

---

### Task 1: Reaction ranges + shared reaction roll

**Files:**
- Modify: `src/shared/dice.ts` (add `REACTION_RANGES`, `dispositionForRoll`, `rollReaction`; refactor `rollDisposition`)
- Test: `src/shared/dice.reaction.test.ts` (create)

**Interfaces:**
- Produces:
  ```ts
  interface ReactionRange { min: number; max: number; disposition: Disposition }
  const REACTION_RANGES: ReactionRange[]
  function dispositionForRoll(total: number): Disposition
  function rollReaction(): { roll: number; disposition: Disposition }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/shared/dice.reaction.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { REACTION_RANGES, dispositionForRoll } from './dice'

describe('dispositionForRoll', () => {
  const expected: Array<[number, string]> = [
    [2, 'hostile'], [3, 'wary'], [5, 'wary'], [6, 'curious'], [8, 'curious'],
    [9, 'kind'], [11, 'kind'], [12, 'helpful'],
  ]
  it.each(expected)('maps 2d6 total %i to %s', (total, disposition) => {
    expect(dispositionForRoll(total)).toBe(disposition)
  })

  it('ranges cover every 2d6 total 2..12 with no gaps', () => {
    for (let t = 2; t <= 12; t++) {
      expect(REACTION_RANGES.some((r) => t >= r.min && t <= r.max)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm test src/shared/dice.reaction.test.ts`
Expected: FAIL — `REACTION_RANGES`/`dispositionForRoll` not exported.

- [ ] **Step 3: Implement and refactor**

In `src/shared/dice.ts`, replace the existing `rollDisposition` function with:

```ts
export interface ReactionRange { min: number; max: number; disposition: Disposition }

export const REACTION_RANGES: ReactionRange[] = [
  { min: 2, max: 2, disposition: 'hostile' },
  { min: 3, max: 5, disposition: 'wary' },
  { min: 6, max: 8, disposition: 'curious' },
  { min: 9, max: 11, disposition: 'kind' },
  { min: 12, max: 12, disposition: 'helpful' },
]

export function dispositionForRoll(total: number): Disposition {
  return REACTION_RANGES.find((r) => total >= r.min && total <= r.max)?.disposition ?? 'curious'
}

/** Roll 2d6 on the NPC reaction table and return a Disposition. */
export function rollDisposition(): Disposition {
  return dispositionForRoll(rollDice('2d6').total)
}

/** Roll 2d6 reaction, returning the raw total and the mapped Disposition. */
export function rollReaction(): { roll: number; disposition: Disposition } {
  const roll = rollDice('2d6').total
  return { roll, disposition: dispositionForRoll(roll) }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm test src/shared/dice.reaction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/dice.ts src/shared/dice.reaction.test.ts
git commit -m "feat: add reaction ranges and rollReaction helper"
```

---

### Task 2: EncounterRollResult type, table persistence field, category-aware sections

**Files:**
- Create: `src/domain/value-objects/EncounterRollResult.ts`
- Modify: `src/domain/entities/EncounterTable.ts` (add `lastResult`)
- Modify: `src/application/use-cases/CreateEncounterTable.ts` (default `lastResult: null`)
- Modify: `src/application/use-cases/RollEncounter.ts` (`getActiveSections` returns `category` + `isCustom`)
- Test: `src/application/use-cases/RollEncounter.sections.test.ts` (create)

**Interfaces:**
- Produces:
  ```ts
  interface EncounterRollResult {
    masterRoll: number
    category: string
    categoryLabel: string
    entryIndex: number
    entryText: string
    reaction?: Disposition
    reactionRoll?: number
    npc?: NPC
    npcSavedId?: string | null
    monsterMatch?: { compendiumId: string; name: string } | null
    rolledAt: number
  }
  ```
- `EncounterTable.lastResult: EncounterRollResult | null`
- `getActiveSections(table)` now returns `Array<{ category: string; label: string; entries: string[]; isCustom: boolean }>`

- [ ] **Step 1: Create the value-object**

Create `src/domain/value-objects/EncounterRollResult.ts`:

```ts
import type { Disposition } from '@shared/constants'
import type { NPC } from '@domain/entities/NPC'

export interface EncounterRollResult {
  /** 1..N over the active sections */
  masterRoll: number
  /** hit category key (EncounterCategory) or custom section id */
  category: string
  categoryLabel: string
  entryIndex: number
  entryText: string
  /** npc/creature only */
  reaction?: Disposition
  reactionRoll?: number
  /** npc category: generated NPC, not yet promoted */
  npc?: NPC
  npcSavedId?: string | null
  /** creature category: matched compendium monster */
  monsterMatch?: { compendiumId: string; name: string } | null
  rolledAt: number
}
```

- [ ] **Step 2: Add the persistence field**

In `src/domain/entities/EncounterTable.ts`, add an import and field:

```ts
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'
```

Add to the `EncounterTable` interface (before `createdAt`):

```ts
  /** Last rolled cascade result (persisted so it survives reloads). */
  lastResult: EncounterRollResult | null
  createdAt: number
```

In `src/application/use-cases/CreateEncounterTable.ts`, set `lastResult: null` in the constructed table literal (alongside the other defaults like `customSections: []`).

- [ ] **Step 3: Write the failing test for category-aware sections**

Create `src/application/use-cases/RollEncounter.sections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getActiveSections } from './RollEncounter'
import type { EncounterTable } from '@domain/entities/EncounterTable'

const table: EncounterTable = {
  id: 't1', ownerPoiId: 'p1', ownerRegionId: null, worldId: 'w1',
  creature: ['Goblin'], signOmen: [], loss: [], npc: ['A merchant'],
  discovery: [], treasure: [], customSections: [{ id: 'cs1', name: 'Weird', entries: ['Glitch'] }],
  disabledCategories: ['treasure'], lastResult: null, createdAt: 0, updatedAt: 0,
}

describe('getActiveSections category metadata', () => {
  it('tags each built-in section with its category key', () => {
    const sections = getActiveSections(table)
    const npc = sections.find((s) => s.label === 'NPC')
    expect(npc?.category).toBe('npc')
    expect(npc?.isCustom).toBe(false)
  })

  it('tags custom sections with their id and isCustom=true', () => {
    const custom = getActiveSections(table).find((s) => s.label === 'Weird')
    expect(custom?.category).toBe('cs1')
    expect(custom?.isCustom).toBe(true)
  })

  it('omits disabled categories', () => {
    expect(getActiveSections(table).some((s) => s.category === 'treasure')).toBe(false)
  })
})
```

- [ ] **Step 4: Run the test, verify it fails**

Run: `pnpm test src/application/use-cases/RollEncounter.sections.test.ts`
Expected: FAIL — sections have no `category`/`isCustom`.

- [ ] **Step 5: Extend `getActiveSections`**

In `src/application/use-cases/RollEncounter.ts`, change the section type and population. Replace the body of `getActiveSections` with:

```ts
export function getActiveSections(
  table: EncounterTable | null,
): Array<{ category: string; label: string; entries: string[]; isCustom: boolean }> {
  const disabled = new Set(table?.disabledCategories ?? [])
  const sections: Array<{ category: string; label: string; entries: string[]; isCustom: boolean }> = []

  for (const cat of ENCOUNTER_CATEGORIES) {
    if (disabled.has(cat)) continue
    const entries = table?.[cat]?.length ? table[cat] : [...DEFAULT_ENCOUNTER_ENTRIES[cat]]
    sections.push({ category: cat, label: CATEGORY_LABELS[cat], entries, isCustom: false })
  }

  if (table?.customSections) {
    for (const cs of table.customSections) {
      if (cs.entries.length > 0) {
        sections.push({ category: cs.id, label: cs.name, entries: cs.entries, isCustom: true })
      }
    }
  }

  return sections
}
```

(`executeRollEncounter` already reads only `.label`/`.entries`, so it keeps working.)

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test src/application/use-cases/RollEncounter.sections.test.ts`
Expected: PASS

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (Fix any `EncounterTable` literal in tests/seed that now needs `lastResult: null`.)

- [ ] **Step 7: Commit**

```bash
git add src/domain/value-objects/EncounterRollResult.ts src/domain/entities/EncounterTable.ts src/application/use-cases/CreateEncounterTable.ts src/application/use-cases/RollEncounter.ts src/application/use-cases/RollEncounter.sections.test.ts
git commit -m "feat: add EncounterRollResult, table lastResult, category-aware sections"
```

---

### Task 3: Compendium monster name-match helper

**Files:**
- Create: `src/domain/services/matchCompendiumMonster.ts`
- Test: `src/domain/services/matchCompendiumMonster.test.ts`

**Interfaces:**
- Produces: `matchCompendiumMonster(entryText: string, systemId: string | null): { compendiumId: string; name: string } | null`
- Consumes: `getMonstersBySystemId` from `@domain/data/compendium` (returns `CompendiumMonster[]` with `.id`, `.name`).

- [ ] **Step 1: Write the failing test**

Create `src/domain/services/matchCompendiumMonster.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchCompendiumMonster } from './matchCompendiumMonster'
import { getMonstersBySystemId } from '@domain/data/compendium'

describe('matchCompendiumMonster', () => {
  it('returns null when systemId is null', () => {
    expect(matchCompendiumMonster('Goblin scouts', null)).toBeNull()
  })

  it('matches a monster whose name appears in the entry text', () => {
    const monsters = getMonstersBySystemId('system-shadowdark')
    // pick a real monster name from the shadowdark compendium
    const sample = monsters[0]
    const match = matchCompendiumMonster(`A pack of ${sample.name} approaches`, 'system-shadowdark')
    expect(match?.compendiumId).toBe(sample.id)
    expect(match?.name).toBe(sample.name)
  })

  it('returns null when no monster name is present', () => {
    expect(matchCompendiumMonster('A gust of cold wind', 'system-shadowdark')).toBeNull()
  })
})
```

(If `'system-shadowdark'` is not the correct system id, read the ids printed by `getMonstersBySystemId` during a quick `pnpm test` run and use a valid one. Cairn/Shadowdark ids are defined in the seed system configs.)

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm test src/domain/services/matchCompendiumMonster.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/services/matchCompendiumMonster.ts`:

```ts
import { getMonstersBySystemId } from '@domain/data/compendium'

/**
 * Best-effort match of a free-text encounter entry to a compendium monster.
 * Matches when a monster's name appears (case-insensitive) in the entry text;
 * prefers the longest name to avoid partial collisions (e.g. "rat" vs "rat king").
 */
export function matchCompendiumMonster(
  entryText: string,
  systemId: string | null,
): { compendiumId: string; name: string } | null {
  if (!systemId) return null
  const text = entryText.toLowerCase()
  const matches = getMonstersBySystemId(systemId).filter((m) =>
    text.includes(m.name.toLowerCase()),
  )
  if (matches.length === 0) return null
  matches.sort((a, b) => b.name.length - a.name.length)
  return { compendiumId: matches[0].id, name: matches[0].name }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm test src/domain/services/matchCompendiumMonster.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/matchCompendiumMonster.ts src/domain/services/matchCompendiumMonster.test.ts
git commit -m "feat: add compendium monster name-match helper"
```

---

### Task 4: Pure cascade engine + re-roll slice functions

**Files:**
- Create: `src/domain/services/encounterCascade.ts`
- Test: `src/domain/services/encounterCascade.test.ts`

**Interfaces:**
- Consumes: `EncounterRollResult` (Task 2); `Disposition` (`@shared/constants`); `NPC` (`@domain/entities/NPC`).
- Produces:
  ```ts
  interface CascadeSection { category: string; label: string; entries: string[]; isCustom: boolean }
  interface CascadeEffects {
    rollDie: (sides: number) => number               // returns 1..sides
    rollReaction: () => { roll: number; disposition: Disposition }
    generateNpc: () => Promise<NPC>
    matchMonster: (text: string) => { compendiumId: string; name: string } | null
    now: () => number
  }
  function rollCascade(sections: CascadeSection[], fx: CascadeEffects): Promise<EncounterRollResult>
  function rerollMaster(sections, fx): Promise<EncounterRollResult>
  function rerollEntry(prev, sections, fx): Promise<EncounterRollResult>
  function rerollReaction(prev, fx): EncounterRollResult
  function rerollNpc(prev, fx): Promise<EncounterRollResult>
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/domain/services/encounterCascade.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  rollCascade, rerollEntry, rerollReaction, rerollNpc,
  type CascadeSection, type CascadeEffects,
} from './encounterCascade'
import type { NPC } from '@domain/entities/NPC'

const sections: CascadeSection[] = [
  { category: 'creature', label: 'Creature', entries: ['Goblin', 'Wolf'], isCustom: false },
  { category: 'npc', label: 'NPC', entries: ['A merchant'], isCustom: false },
  { category: 'discovery', label: 'Discovery', entries: ['A locked chest'], isCustom: false },
]

const fakeNpc = { id: 'npc-1', name: 'Test NPC' } as unknown as NPC

function fx(over: Partial<CascadeEffects> = {}): CascadeEffects {
  return {
    rollDie: (sides) => sides,                                   // always max
    rollReaction: () => ({ roll: 7, disposition: 'curious' }),
    generateNpc: async () => fakeNpc,
    matchMonster: () => ({ compendiumId: 'mon-1', name: 'Goblin' }),
    now: () => 123,
    ...over,
  }
}

describe('rollCascade', () => {
  it('rolls master, then an entry, with timestamp', async () => {
    const r = await rollCascade(sections, fx({ rollDie: () => 1 }))
    expect(r.masterRoll).toBe(1)
    expect(r.category).toBe('creature')
    expect(r.entryText).toBe('Goblin')   // rollDie=1 → index 0
    expect(r.rolledAt).toBe(123)
  })

  it('enriches creature with reaction + monster match', async () => {
    const r = await rollCascade(sections, fx({ rollDie: () => 1 }))
    expect(r.reaction).toBe('curious')
    expect(r.reactionRoll).toBe(7)
    expect(r.monsterMatch).toEqual({ compendiumId: 'mon-1', name: 'Goblin' })
    expect(r.npc).toBeUndefined()
  })

  it('enriches npc with reaction + generated npc + null savedId', async () => {
    // master roll lands on section index 2 (npc), entry index 1 → clamp via entries len 1
    const r = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 2 : 1) }))
    expect(r.category).toBe('npc')
    expect(r.npc).toBe(fakeNpc)
    expect(r.npcSavedId).toBeNull()
    expect(r.reaction).toBe('curious')
    expect(r.monsterMatch).toBeUndefined()
  })

  it('leaves other categories as plain text (no reaction/npc/monster)', async () => {
    const r = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 3 : 1) }))
    expect(r.category).toBe('discovery')
    expect(r.reaction).toBeUndefined()
    expect(r.npc).toBeUndefined()
    expect(r.monsterMatch).toBeUndefined()
  })
})

describe('reroll slices', () => {
  it('rerollEntry keeps category and preserves an existing reaction', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 }))  // creature, curious
    let reactionCalls = 0
    const r = await rerollEntry(prev, sections, fx({
      rollDie: () => 2,                                           // entry index 1 → 'Wolf'
      rollReaction: () => { reactionCalls++; return { roll: 2, disposition: 'hostile' } },
    }))
    expect(r.category).toBe('creature')
    expect(r.entryText).toBe('Wolf')
    expect(r.reaction).toBe('curious')                           // preserved
    expect(reactionCalls).toBe(0)
  })

  it('rerollReaction changes only the reaction', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 }))
    const r = rerollReaction(prev, fx({ rollReaction: () => ({ roll: 12, disposition: 'helpful' }) }))
    expect(r.reaction).toBe('helpful')
    expect(r.entryText).toBe(prev.entryText)
  })

  it('rerollNpc regenerates the npc and resets savedId', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 2 : 1) }))
    const other = { id: 'npc-2', name: 'Other' } as unknown as NPC
    const r = await rerollNpc({ ...prev, npcSavedId: 'saved-x' }, fx({ generateNpc: async () => other }))
    expect(r.npc).toBe(other)
    expect(r.npcSavedId).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `pnpm test src/domain/services/encounterCascade.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the engine**

Create `src/domain/services/encounterCascade.ts`:

```ts
import type { Disposition } from '@shared/constants'
import type { NPC } from '@domain/entities/NPC'
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'

export interface CascadeSection {
  category: string
  label: string
  entries: string[]
  isCustom: boolean
}

export interface CascadeEffects {
  /** roll 1..sides */
  rollDie: (sides: number) => number
  rollReaction: () => { roll: number; disposition: Disposition }
  generateNpc: () => Promise<NPC>
  matchMonster: (text: string) => { compendiumId: string; name: string } | null
  now: () => number
}

function pickEntry(section: CascadeSection, fx: CascadeEffects): { entryText: string; entryIndex: number } {
  if (section.entries.length === 0) return { entryText: '(empty)', entryIndex: 0 }
  const entryIndex = fx.rollDie(section.entries.length) - 1
  return { entryText: section.entries[entryIndex] ?? section.entries[0], entryIndex }
}

async function buildResult(
  masterRoll: number,
  section: CascadeSection,
  fx: CascadeEffects,
  preservedReaction?: { roll: number; disposition: Disposition },
): Promise<EncounterRollResult> {
  const { entryText, entryIndex } = pickEntry(section, fx)
  const base: EncounterRollResult = {
    masterRoll,
    category: section.category,
    categoryLabel: section.label,
    entryIndex,
    entryText,
    rolledAt: fx.now(),
  }

  if (section.category === 'npc') {
    const reaction = preservedReaction ?? fx.rollReaction()
    const npc = await fx.generateNpc()
    return { ...base, reaction: reaction.disposition, reactionRoll: reaction.roll, npc, npcSavedId: null }
  }

  if (section.category === 'creature') {
    const reaction = preservedReaction ?? fx.rollReaction()
    return {
      ...base,
      reaction: reaction.disposition,
      reactionRoll: reaction.roll,
      monsterMatch: fx.matchMonster(entryText),
    }
  }

  return base
}

export async function rollCascade(sections: CascadeSection[], fx: CascadeEffects): Promise<EncounterRollResult> {
  if (sections.length === 0) throw new Error('rollCascade: no active sections')
  const masterRoll = fx.rollDie(sections.length)
  return buildResult(masterRoll, sections[masterRoll - 1], fx)
}

export async function rerollMaster(sections: CascadeSection[], fx: CascadeEffects): Promise<EncounterRollResult> {
  return rollCascade(sections, fx)
}

export async function rerollEntry(
  prev: EncounterRollResult,
  sections: CascadeSection[],
  fx: CascadeEffects,
): Promise<EncounterRollResult> {
  const section = sections.find((s) => s.category === prev.category)
  if (!section) return rollCascade(sections, fx)
  const preserved =
    prev.reaction && prev.reactionRoll != null
      ? { roll: prev.reactionRoll, disposition: prev.reaction }
      : undefined
  return buildResult(prev.masterRoll, section, fx, preserved)
}

export function rerollReaction(prev: EncounterRollResult, fx: CascadeEffects): EncounterRollResult {
  if (prev.category !== 'npc' && prev.category !== 'creature') return prev
  const reaction = fx.rollReaction()
  return { ...prev, reaction: reaction.disposition, reactionRoll: reaction.roll }
}

export async function rerollNpc(prev: EncounterRollResult, fx: CascadeEffects): Promise<EncounterRollResult> {
  if (prev.category !== 'npc') return prev
  const npc = await fx.generateNpc()
  return { ...prev, npc, npcSavedId: null }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `pnpm test src/domain/services/encounterCascade.test.ts`
Expected: PASS (all cases)

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/encounterCascade.ts src/domain/services/encounterCascade.test.ts
git commit -m "feat: add pure encounter cascade engine with reroll slices"
```

---

### Task 5: Action-layer wiring (bind effects, persist to table)

**Files:**
- Modify: `src/ui/hooks/usePOIActions.ts` (add cascade handlers)
- Test: `src/ui/hooks/encounterCascadeActions.test.ts` (create — test the pure binding/orchestration helper, see below)

To keep this testable without a React hook harness, put the orchestration in a **plain async function** that `usePOIActions` calls.

**Interfaces:**
- Create: `src/application/use-cases/RollEncounterCascade.ts` exporting:
  ```ts
  interface CascadeContext {
    table: EncounterTable | null
    poiId: string | null
    regionId: string | null
    worldId: string
    systemConfig: SystemConfig
  }
  interface CascadeUseCaseDeps {
    encounterTableRepo: IEncounterTableRepository
    tableRepo: ITableRepository
  }
  type CascadeAction =
    | { kind: 'roll' } | { kind: 'rerollAll' } | { kind: 'rerollMaster' }
    | { kind: 'rerollEntry' } | { kind: 'rerollReaction' } | { kind: 'rerollNpc' }
  function executeEncounterCascade(action, ctx, deps): Promise<EncounterRollResult>
  ```
  It resolves sections via `getActiveSections(ctx.table)`, builds `CascadeEffects` (binding `rollDice`, `rollReaction`, `executeGenerateNPC`, `matchCompendiumMonster(_, systemConfig.systemId)`, `Date.now`), runs the requested engine function (using `ctx.table.lastResult` as `prev` for reroll slices), then **persists**: ensures an `EncounterTable` row exists (create via the same path `usePOIActions` already uses for `handleSaveEncounterTable` if `ctx.table` is null and `poiId` is set), writes `lastResult`, and returns the result.

- [ ] **Step 1: Write the failing test for effect binding**

Because `executeGenerateNPC` needs Dexie + system config, test the **effects builder** in isolation. Add an exported pure helper `buildCascadeEffects(ctx, deps)` and test that its `rollDie`, `rollReaction`, `matchMonster`, and `now` behave (NPC generation is covered by its own existing tests; stub `tableRepo`).

Create `src/ui/hooks/encounterCascadeActions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCascadeEffects } from '@application/use-cases/RollEncounterCascade'

const ctx = {
  table: null, poiId: 'p1', regionId: null, worldId: 'w1',
  systemConfig: { systemId: 'system-shadowdark' } as any,
}

describe('buildCascadeEffects', () => {
  it('rollDie returns a value within 1..sides', () => {
    const fx = buildCascadeEffects(ctx as any, {} as any)
    const v = fx.rollDie(6)
    expect(v).toBeGreaterThanOrEqual(1)
    expect(v).toBeLessThanOrEqual(6)
  })

  it('rollReaction returns a 2..12 roll and a disposition', () => {
    const fx = buildCascadeEffects(ctx as any, {} as any)
    const r = fx.rollReaction()
    expect(r.roll).toBeGreaterThanOrEqual(2)
    expect(r.roll).toBeLessThanOrEqual(12)
    expect(['hostile', 'wary', 'curious', 'kind', 'helpful']).toContain(r.disposition)
  })

  it('matchMonster delegates to the compendium matcher for the ctx system', () => {
    const fx = buildCascadeEffects(ctx as any, {} as any)
    // a clearly-non-monster string yields null
    expect(fx.matchMonster('a quiet breeze')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm test src/ui/hooks/encounterCascadeActions.test.ts`
Expected: FAIL — module/`buildCascadeEffects` not found.

- [ ] **Step 3: Implement the use case**

Create `src/application/use-cases/RollEncounterCascade.ts`:

```ts
import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { ITableRepository } from '@application/ports/ITableRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import { rollDice, rollReaction as rollReaction2d6 } from '@shared/dice'
import { getActiveSections } from './RollEncounter'
import { executeGenerateNPC } from './GenerateNPC'
import { matchCompendiumMonster } from '@domain/services/matchCompendiumMonster'
import {
  rollCascade, rerollMaster, rerollEntry, rerollReaction, rerollNpc,
  type CascadeEffects, type CascadeSection,
} from '@domain/services/encounterCascade'

export interface CascadeContext {
  table: EncounterTable | null
  poiId: string | null
  regionId: string | null
  worldId: string
  systemConfig: SystemConfig
}

export interface CascadeUseCaseDeps {
  encounterTableRepo: IEncounterTableRepository
  tableRepo: ITableRepository
}

export type CascadeAction =
  | { kind: 'roll' } | { kind: 'rerollAll' } | { kind: 'rerollMaster' }
  | { kind: 'rerollEntry' } | { kind: 'rerollReaction' } | { kind: 'rerollNpc' }

export function buildCascadeEffects(ctx: CascadeContext, deps: CascadeUseCaseDeps): CascadeEffects {
  return {
    rollDie: (sides) => rollDice(`1d${sides}`).total,
    rollReaction: () => rollReaction2d6(),
    generateNpc: () =>
      executeGenerateNPC(
        { worldId: ctx.worldId, systemConfig: ctx.systemConfig, regionId: ctx.regionId ?? undefined },
        { tableRepo: deps.tableRepo },
      ),
    matchMonster: (text) => matchCompendiumMonster(text, ctx.systemConfig.systemId),
    now: () => Date.now(),
  }
}

function sectionsOf(ctx: CascadeContext): CascadeSection[] {
  return getActiveSections(ctx.table)
}

export async function executeEncounterCascade(
  action: CascadeAction,
  ctx: CascadeContext,
  deps: CascadeUseCaseDeps,
): Promise<EncounterRollResult> {
  const sections = sectionsOf(ctx)
  if (sections.length === 0) throw new Error('No active encounter sections to roll')
  const fx = buildCascadeEffects(ctx, deps)
  const prev = ctx.table?.lastResult ?? null

  let result: EncounterRollResult
  switch (action.kind) {
    case 'roll':
    case 'rerollAll':
      result = await rollCascade(sections, fx)
      break
    case 'rerollMaster':
      result = await rerollMaster(sections, fx)
      break
    case 'rerollEntry':
      result = prev ? await rerollEntry(prev, sections, fx) : await rollCascade(sections, fx)
      break
    case 'rerollReaction':
      result = prev ? rerollReaction(prev, fx) : await rollCascade(sections, fx)
      break
    case 'rerollNpc':
      result = prev ? await rerollNpc(prev, fx) : await rollCascade(sections, fx)
      break
  }

  await persistResult(result, ctx, deps)
  return result
}

async function persistResult(
  result: EncounterRollResult,
  ctx: CascadeContext,
  deps: CascadeUseCaseDeps,
): Promise<void> {
  if (ctx.table) {
    await deps.encounterTableRepo.update({ ...ctx.table, lastResult: result, updatedAt: Date.now() })
  }
  // If no table row exists yet, the caller (usePOIActions) creates one first; see Task 5 wiring.
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm test src/ui/hooks/encounterCascadeActions.test.ts`
Expected: PASS

- [ ] **Step 5: Wire handlers into `usePOIActions`**

In `src/ui/hooks/usePOIActions.ts`, add (mirroring the existing `handleRollEncounter`/`handleSaveEncounterTable`):

```ts
import { executeEncounterCascade, type CascadeAction, type CascadeContext } from '@application/use-cases/RollEncounterCascade'
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
```

Add a handler that ensures a table row exists, then runs the cascade. Use the existing table-creation path this hook already uses for `handleSaveEncounterTable` (it creates a row with `{ ownerPoiId: poi.id, worldId }` when none exists). Concretely:

```ts
  const handleEncounterCascade = async (action: CascadeAction): Promise<EncounterRollResult> => {
    if (!poi || !systemConfig || !region) throw new Error('Missing context for encounter cascade')
    // Ensure a persistable table row exists (lazily create for this POI).
    let table = encounterTable ?? null
    if (!table) {
      table = await ensureEncounterTableForPoi(poi, region, container) // existing create path / extract from handleSaveEncounterTable
    }
    const ctx: CascadeContext = {
      table, poiId: poi.id, regionId: poi.regionId, worldId: region.worldId, systemConfig,
    }
    return executeEncounterCascade(action, ctx, {
      encounterTableRepo: container.encounterTableRepo,
      tableRepo: container.tableRepo,
    })
  }

  const handleSaveEncounterNpc = async (): Promise<void> => {
    const result = encounterTable?.lastResult
    if (!poi || !result?.npc || result.npcSavedId) return
    const npc = { ...result.npc, poiId: poi.id }
    await executeCreateNPC(npc, { npcRepo: container.npcRepo })
    await container.encounterTableRepo.update({
      ...encounterTable!, lastResult: { ...result, npcSavedId: npc.id }, updatedAt: Date.now(),
    })
  }
```

Note: `systemConfig` must be available to `usePOIActions`. It currently receives `(poi, region, encounterTable, container)` — extend its signature to also accept `systemConfig` and thread it from the route (`pois_.$poiId.tsx` already has `systemConfig`). If `ensureEncounterTableForPoi` does not already exist, factor it out of the existing `handleSaveEncounterTable` create branch so both call one helper (DRY).

Return the new handlers from the hook.

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/RollEncounterCascade.ts src/ui/hooks/usePOIActions.ts src/ui/hooks/encounterCascadeActions.test.ts src/routes/_app/realms/pois_.\$poiId.tsx
git commit -m "feat: wire encounter cascade actions and save-as-npc"
```

---

### Task 6: EncounterCascade component + Encounters tab integration

**Files:**
- Create: `src/components/shared/EncounterCascade.tsx`
- Create: `src/components/shared/EncounterResultCards.tsx` (NPC card + monster card + flavor card; extract a small shared NPC stat display from the Denizens `RoomNPCCard` if reuse is clean, else render the fields directly)
- Modify: `src/components/poi-templates/DungeonTemplate.tsx` (Encounters tab: render `EncounterCascade` with a mode toggle that falls back to the existing `EncounterTableUI`)

**Interfaces:**
- `EncounterCascade` props:
  ```ts
  interface EncounterCascadeProps {
    table: EncounterTable | null | undefined
    onRollCascade: (action: CascadeAction) => Promise<EncounterRollResult>
    onSaveNpc?: () => Promise<void>           // shown only when a poiId-scoped owner exists
    // edit mode delegates to the existing editor:
    onSaveTable?: (entries: SavePayload) => void
    onRoll: () => Promise<RollEncounterResult>  // legacy roll for the editor
    systemId?: string | null
    worldId?: string | null
  }
  ```
- Reads the persisted `table.lastResult` for display (the component does not hold the result in its own state beyond a loading flag; after each `onRollCascade` it relies on the live `table` prop updating via the route's `useEncounterTable` subscription).

- [ ] **Step 1: Build the component (Roll mode)**

Render, in order, using `getActiveSections(table)` for the master/entry rows and `REACTION_RANGES` for the reaction rows. Highlight the rolled row by comparing index to `lastResult.masterRoll - 1`, `lastResult.entryIndex`, and the reaction range containing `lastResult.reactionRoll`. Mirror the existing `EncounterTableUI` card styling and the Hexbinder layout described in the spec:

```tsx
// Skeleton — follow EncounterTableUI's Tailwind card classes.
// 1. Mode toggle: [Roll] [Edit tables]
// 2. Result banner: summary text + "Re-roll All" → onRollCascade({kind:'rerollAll'})
//    empty state → "Roll an encounter" → onRollCascade({kind:'roll'})
// 3. Master Table card: list getActiveSections(table) labels;
//    highlight index === lastResult.masterRoll-1; re-roll → {kind:'rerollMaster'}
// 4. Category entries sub-table: entries of the hit section;
//    highlight index === lastResult.entryIndex; re-roll → {kind:'rerollEntry'}
// 5. Reaction sub-table (only when lastResult.reaction): REACTION_RANGES rows;
//    highlight the range containing lastResult.reactionRoll; re-roll → {kind:'rerollReaction'}
// 6. Result card via <EncounterResultCards result={lastResult} onSaveNpc onRerollNpc/>
```

`EncounterResultCards` renders:
- `npc`: NPC stat display (name, race/class, AC/HP/level from `npc.systemBlock`, description, `want`), the reaction tag, **Save as NPC** button (calls `onSaveNpc`, disabled + "Saved ✓" when `result.npcSavedId`), and a **Re-roll NPC** button → `onRollCascade({kind:'rerollNpc'})`.
- `creature`: `<MonsterStatBlock monster={getMonsterStats(result.monsterMatch.compendiumId)} />` when `monsterMatch` is set (reuse from `MonsterSearchTab`), else the entry text; plus the reaction tag.
- other: a simple card showing `entryText`.

Edit mode renders the existing `<EncounterTableUI table onRoll onSave/>` unchanged.

- [ ] **Step 2: Integrate into the Encounters tab**

In `src/components/poi-templates/DungeonTemplate.tsx`, replace the `<EncounterTableUI .../>` in `<TabsContent value="encounters">` with:

```tsx
          <EncounterCascade
            table={encounterTable}
            onRollCascade={onRollCascade}
            onSaveNpc={onSaveEncounterNpc}
            onSaveTable={onSaveEncounterTable}
            onRoll={onRollEncounter}
            systemId={systemId}
            worldId={worldId}
          />
```

Add the new props (`onRollCascade`, `onSaveEncounterNpc`) to `DungeonTemplate`'s props interface and destructure them; thread them from the route (`actions.handleEncounterCascade`, `actions.handleSaveEncounterNpc`).

- [ ] **Step 3: Typecheck + build**

Run: `pnpm exec tsc --noEmit` → no errors.
Run: `pnpm build` → succeeds.

- [ ] **Step 4: Manual smoke**

`pnpm dev`, open a dungeon POI → Encounters tab → Roll an encounter. Verify: master/entry/reaction tables show with the hit row highlighted; per-table re-roll updates only that slice; an `npc` roll shows a full NPC card with Save as NPC (which then appears in Denizens); a `creature` roll shows a monster card when the name matches the compendium.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/EncounterCascade.tsx src/components/shared/EncounterResultCards.tsx src/components/poi-templates/DungeonTemplate.tsx src/routes/_app/realms/pois_.\$poiId.tsx
git commit -m "feat: cascading encounter UI in the dungeon Encounters tab"
```

---

### Task 7: Roll out to the remaining templates + region route

**Files:**
- Modify: `src/components/poi-templates/SettlementTemplate.tsx`, `GenericTemplate.tsx`, `BuildingTemplate.tsx` (swap `EncounterTableUI` → `EncounterCascade`, thread the same props)
- Modify: the region encounters route/usage that renders `EncounterTableUI`
- Modify: the corresponding action providers so each owner passes `onRollCascade` and (for POI owners) `onSaveNpc`; region-scoped usage passes no `onSaveNpc` (per spec, Save-as-NPC hidden for region scope in v1)

**Interfaces:**
- Consumes: `handleEncounterCascade`/`handleSaveEncounterNpc` (POI) — for the region route, an equivalent `executeEncounterCascade` call built from the region context (`table`, `poiId: null`, `regionId`, `worldId`, `systemConfig`).

- [ ] **Step 1: Swap each template**

For each of `SettlementTemplate`, `GenericTemplate`, `BuildingTemplate`: replace the `EncounterTableUI` usage with `EncounterCascade` passing `table`, `onRollCascade`, `onSaveNpc` (POI owners only), `onSaveTable`, `onRoll`, `systemId`, `worldId`. Add the props to each template's props interface and thread from the POI route (same `actions.*` handlers as Task 6).

- [ ] **Step 2: Region route**

In the region route that renders `EncounterTableUI`, add an `onRollCascade` that calls `executeEncounterCascade(action, { table, poiId: null, regionId: region.id, worldId: region.worldId, systemConfig }, { encounterTableRepo, tableRepo })` and omit `onSaveNpc`. Ensure a region-owned `EncounterTable` row exists (reuse the region create path already in that route).

- [ ] **Step 3: Typecheck + build**

Run: `pnpm exec tsc --noEmit` → no errors.
Run: `pnpm build` → succeeds.
Run: `pnpm test` → all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: enable encounter cascade across all templates and region route"
```

---

## Self-Review

**Spec coverage:**
- Reuse editable `EncounterTable` as master → Task 2 (`getActiveSections` category-aware) + Task 4 (engine over sections). ✓
- Persist result on `EncounterTable.lastResult` → Task 2 (field) + Task 5 (persist). ✓
- Enrich npc (reaction + generated NPC) / creature (reaction + monster match) → Task 4 + Task 5 (effects) + Task 3 (matcher). ✓
- Reaction = 2d6 `rollDisposition` → Task 1. ✓
- Re-roll all / master / entry / reaction / npc → Task 4 functions + Task 5 dispatch. ✓
- Result cards (NPC card + Save as NPC, monster card, flavor) → Task 6. ✓
- Edit-tables mode preserves `EncounterTableUI` → Task 6. ✓
- All templates + region route → Task 7; Save-as-NPC hidden for region scope → Task 7 Step 2. ✓
- Auto-match creature to compendium by name → Task 3. ✓
- Edge cases: no sections (throw + UI empty state) → Task 4/5/6; no monster match (null) → Task 3; NPC re-roll clears unsaved NPC → Task 4 `rerollNpc`. ✓

**Placeholder scan:** UI JSX in Task 6 is given as an annotated skeleton tied to concrete data (`getActiveSections`, `REACTION_RANGES`, `lastResult.*` indices, named callbacks) following the existing `EncounterTableUI` styling — no undefined symbols. One implementation detail (`ensureEncounterTableForPoi`) is explicitly "extract from the existing `handleSaveEncounterTable` create branch."

**Type consistency:** `EncounterRollResult` fields are used identically across engine (Task 4), use case (Task 5), and UI (Task 6). `CascadeEffects`/`CascadeSection`/`CascadeAction` names match between `encounterCascade.ts` and `RollEncounterCascade.ts`. `getActiveSections` new return shape (`category`/`isCustom`) is consumed by `CascadeSection` (same fields). `matchCompendiumMonster(text, systemId)` signature matches its effect binding.

**Known follow-ups (acceptable for v1):** component-level render tests are light (logic is covered by engine/use-case unit tests); the NPC stat display may require a small extraction from `RoomNPCCard` (flagged in Task 6 files).
</content>
