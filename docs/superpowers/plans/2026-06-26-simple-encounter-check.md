# Simple 1d6 Encounter Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Encounter Check" button to the dungeon Rooms tab that rolls `1dN` (configurable "1 in N" chance) and, on a `1`, auto-runs the existing wandering-monster roll.

**Architecture:** A new nullable `encounterChance` field on `POI` (default 6). A pure helper decides trigger/no-trigger. `WanderingMonsterTable` gains an editable "1 in N" input and an Encounter Check button next to the existing Roll button; on a triggered check it calls the component's existing `handleRoll`.

**Tech Stack:** TypeScript (strict), React, Dexie, Vitest, Tailwind.

## Global Constraints

- Use `pnpm` only (never `npm`).
- TypeScript strict mode — every full `POI` constructor must set new fields.
- Build = `pnpm build` (runs `vite build && tsc --noEmit`); tests = `pnpm test`.
- Dice come from `@shared/dice` `rollDice(notation)`; do not use `Math.random` for the check.

---

### Task 1: Add `encounterChance` to the POI model

**Files:**
- Modify: `src/domain/entities/POI.ts` (add field after `wanderingMonsters`)
- Modify: `src/domain/services/worldgen/buildPoi.ts` (~line 59)
- Modify: `src/application/use-cases/GenerateDungeon.ts` (the two full POI literals, ~lines 148 and ~378, each near `wanderingMonsters: []`)
- Modify: `src/application/use-cases/GenerateRegion.ts` (~line 73, near `wanderingMonsters: []`)
- Modify: `src/infrastructure/dexie/db.ts` (the full POI literal near `wanderingMonsters: []`, ~line 682)
- Modify: `src/infrastructure/dev/devApi.ts` (~line 279, near `wanderingMonsters: data.wanderingMonsters ?? []`)
- Test: `src/domain/services/worldgen/buildPoi.test.ts` (create)

**Interfaces:**
- Produces: `POI.encounterChance: number | null` (null ⇒ treat as default 6 at use sites).

- [ ] **Step 1: Write the failing test**

Create `src/domain/services/worldgen/buildPoi.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPOI } from './buildPoi'

describe('buildPOI', () => {
  it('defaults encounterChance to null', () => {
    const poi = buildPOI({ regionId: 'r1', name: 'Cave', type: 'dungeon' })
    expect(poi.encounterChance).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm test src/domain/services/worldgen/buildPoi.test.ts`
Expected: FAIL — `encounterChance` does not exist on `POI` (type error) or is `undefined`.

- [ ] **Step 3: Add the field to the entity**

In `src/domain/entities/POI.ts`, add directly after the `wanderingMonsters` line:

```ts
  wanderingMonsters: WanderingMonsterEntry[]
  /** Encounter-check chance denominator: roll 1dN, encounter on a 1. null = default (6). */
  encounterChance: number | null
```

- [ ] **Step 4: Set the default in every full POI constructor**

In `src/domain/services/worldgen/buildPoi.ts`, add after `wanderingMonsters: [],`:

```ts
    wanderingMonsters: [],
    encounterChance: null,
```

Apply the identical `encounterChance: null,` line immediately after each `wanderingMonsters: []` (or `wanderingMonsters: [...]`) line in:
- `src/application/use-cases/GenerateDungeon.ts` (both literals)
- `src/application/use-cases/GenerateRegion.ts`
- `src/infrastructure/dexie/db.ts`

In `src/infrastructure/dev/devApi.ts`, after the `wanderingMonsters: data.wanderingMonsters ?? [],` line add:

```ts
      wanderingMonsters: data.wanderingMonsters ?? [],
      encounterChance: data.encounterChance ?? null,
```

- [ ] **Step 5: Run the test + typecheck, verify pass**

Run: `pnpm test src/domain/services/worldgen/buildPoi.test.ts`
Expected: PASS

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If `tsc` flags a POI literal missing `encounterChance`, add `encounterChance: null` there too.)

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/POI.ts src/domain/services/worldgen/buildPoi.ts src/domain/services/worldgen/buildPoi.test.ts src/application/use-cases/GenerateDungeon.ts src/application/use-cases/GenerateRegion.ts src/infrastructure/dexie/db.ts src/infrastructure/dev/devApi.ts
git commit -m "feat: add encounterChance field to POI"
```

---

### Task 2: Pure encounter-check helper

**Files:**
- Create: `src/shared/encounterCheck.ts`
- Test: `src/shared/encounterCheck.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface EncounterCheckResult { roll: number; chance: number; triggered: boolean }
  function evaluateEncounterCheck(chance: number | null, rollSides: (sides: number) => number): EncounterCheckResult
  ```
  `chance` is clamped to `[2, 20]`, defaulting to `6` when null. `triggered` is true iff the roll equals 1.

- [ ] **Step 1: Write the failing test**

Create `src/shared/encounterCheck.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { evaluateEncounterCheck } from './encounterCheck'

describe('evaluateEncounterCheck', () => {
  it('triggers when the roll is 1', () => {
    const r = evaluateEncounterCheck(6, () => 1)
    expect(r).toEqual({ roll: 1, chance: 6, triggered: true })
  })

  it('does not trigger on a non-1 roll', () => {
    const r = evaluateEncounterCheck(6, () => 4)
    expect(r.triggered).toBe(false)
    expect(r.roll).toBe(4)
  })

  it('defaults a null chance to 6', () => {
    expect(evaluateEncounterCheck(null, () => 2).chance).toBe(6)
  })

  it('clamps chance to the 2..20 range', () => {
    expect(evaluateEncounterCheck(1, () => 1).chance).toBe(2)
    expect(evaluateEncounterCheck(999, () => 1).chance).toBe(20)
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm test src/shared/encounterCheck.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/shared/encounterCheck.ts`:

```ts
export interface EncounterCheckResult {
  roll: number
  chance: number
  triggered: boolean
}

/** Roll 1dN (N = clamped chance) and trigger an encounter on a 1. */
export function evaluateEncounterCheck(
  chance: number | null,
  rollSides: (sides: number) => number,
): EncounterCheckResult {
  const n = Math.max(2, Math.min(20, chance ?? 6))
  const roll = rollSides(n)
  return { roll, chance: n, triggered: roll === 1 }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm test src/shared/encounterCheck.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/encounterCheck.ts src/shared/encounterCheck.test.ts
git commit -m "feat: add evaluateEncounterCheck helper"
```

---

### Task 3: Wire the Encounter Check button into the Rooms tab

**Files:**
- Modify: `src/components/shared/WanderingMonsterTable.tsx` (props interface ~19-31; destructure ~33-41; header buttons ~111-133)
- Modify: `src/components/poi-templates/DungeonTemplate.tsx` (the `<WanderingMonsterTable .../>` usage ~lines 1040-1047)

**Interfaces:**
- Consumes: `evaluateEncounterCheck` from `@shared/encounterCheck`; `rollDice` from `@shared/dice`; the component's existing `handleRoll` and `dieSize`.
- Produces (new optional props on `WanderingMonsterTable`):
  ```ts
  encounterChance?: number | null
  onSaveEncounterChance?: (n: number) => void
  ```
  The check UI renders only when `onSaveEncounterChance` is provided.

- [ ] **Step 1: Add the props**

In `src/components/shared/WanderingMonsterTable.tsx`, extend `WanderingMonsterTableProps` (after `worldId?`):

```ts
  /** World ID for custom compendium entries */
  worldId?: string | null
  /** Encounter-check chance denominator (1 in N). Enables the Encounter Check button when onSaveEncounterChance is set. */
  encounterChance?: number | null
  onSaveEncounterChance?: (n: number) => void
```

Add to the destructured params (after `worldId,`):

```ts
  worldId,
  encounterChance,
  onSaveEncounterChance,
```

- [ ] **Step 2: Add imports and check state**

At the top of the file, add to the existing imports:

```ts
import { evaluateEncounterCheck } from '@shared/encounterCheck'
```

`rollDice` is already imported. After the existing `rollTimers` ref declaration (~line 48), add:

```ts
  const [checkResult, setCheckResult] = useState<string | null>(null)
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEncounterCheck = useCallback(() => {
    const { roll, chance, triggered } = evaluateEncounterCheck(
      encounterChance ?? null,
      (sides) => rollDice(`1d${sides}`).total,
    )
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (triggered) {
      setCheckResult(`🎲 ${roll}/${chance} — Encounter! Rolling…`)
      handleRoll()
    } else {
      setCheckResult(`🎲 ${roll}/${chance} — No encounter`)
    }
    checkTimer.current = setTimeout(() => setCheckResult(null), 4000)
  }, [encounterChance, handleRoll])
```

Extend the existing cleanup effect (the `useEffect` returning `rollTimers.current.forEach(clearTimeout)`) to also clear the check timer:

```ts
  useEffect(() => {
    return () => {
      rollTimers.current.forEach(clearTimeout)
      if (checkTimer.current) clearTimeout(checkTimer.current)
    }
  }, [])
```

- [ ] **Step 3: Render the check controls in the header**

In the header button group (the `<div className="flex items-center gap-1.5">` containing Add and Roll), insert before the existing `{dieSize > 0 && (` Roll button:

```tsx
          {onSaveEncounterChance && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">1 in</span>
              <Input
                type="number"
                min={2}
                max={20}
                value={encounterChance ?? 6}
                onChange={(e) => {
                  const n = Math.max(2, Math.min(20, Number(e.target.value) || 6))
                  onSaveEncounterChance(n)
                }}
                className="h-7 w-14 px-1 text-center text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleEncounterCheck}
                className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              >
                <Dices className="size-3.5" />
                Encounter Check
              </Button>
            </div>
          )}
```

Immediately after the header `</div>` (the `flex items-center justify-between` row), add the transient result line:

```tsx
      {checkResult && (
        <p className="mb-2 text-xs text-red-400">{checkResult}</p>
      )}
```

(`Input` is already imported in this file; `Dices` and `useCallback`/`useEffect`/`useState`/`useRef` are already imported.)

- [ ] **Step 4: Pass the props from DungeonTemplate**

In `src/components/poi-templates/DungeonTemplate.tsx`, update the `<WanderingMonsterTable .../>` usage to add:

```tsx
              systemId={systemId}
              worldId={worldId}
              encounterChance={poi.encounterChance}
              onSaveEncounterChance={(n) =>
                db.pois.update(poi.id, { encounterChance: n, updatedAt: Date.now() })
              }
```

(`db` is already imported in DungeonTemplate — it is used by the visited toggle.)

- [ ] **Step 5: Typecheck + build**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Manual smoke (optional)**

Run `pnpm dev`, open a dungeon POI with wandering-monster entries, set "1 in 2", click Encounter Check repeatedly — verify it sometimes shows "Encounter! Rolling…" and runs the wandering-monster animation, otherwise "No encounter".

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/WanderingMonsterTable.tsx src/components/poi-templates/DungeonTemplate.tsx
git commit -m "feat: add encounter check button to dungeon rooms tab"
```

---

## Self-Review

- **Spec coverage:** Feature 2 of the spec (config field, "1 in N" input, Encounter Check button, triggers wandering roll on a 1, transient miss text, clamp 2–20, enabled only when handler provided) — all covered by Tasks 1–3.
- **Placeholder scan:** none.
- **Type consistency:** `encounterChance: number | null` consistent across entity, helper (`chance: number | null`), props, and DungeonTemplate wiring. `evaluateEncounterCheck(chance, rollSides)` signature matches its call site.
</content>
