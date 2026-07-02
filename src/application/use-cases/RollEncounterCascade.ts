import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { ITableRepository } from '@application/ports/ITableRepository'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import { rollDice, rollReaction as rollReaction2d6 } from '@shared/dice'
import { getActiveSections } from './RollEncounter'
import { executeGenerateNPC } from './GenerateNPC'
import { matchCompendiumMonster } from '@domain/services/matchCompendiumMonster'
import {
  rollCascade,
  rerollMaster,
  rerollEntry,
  rerollReaction,
  rerollActivity,
  rerollNpc,
  pickMaster,
  pickEntryAt,
  pickReaction,
  type CascadeEffects,
  type CascadeSection,
} from '@domain/services/encounterCascade'
import { CREATURE_ACTIVITIES, NPC_ACTIVITIES } from '@domain/data/default-encounter-tables'
import type { Disposition } from '@shared/constants'
import { matchRegionLocation } from '@domain/services/matchRegionLocation'

export interface CascadeContext {
  table: EncounterTable | null
  poiId: string | null
  regionId: string | null
  worldId: string
  systemConfig: SystemConfig
  regionPois?: { id: string; name: string }[]
  /** Region terrain — drives the cascade's locale (biome) section. */
  terrain?: string | null
  /** POI type — 'settlement' surfaces the town-street locale section. */
  poiType?: string | null
}

export interface CascadeUseCaseDeps {
  encounterTableRepo: IEncounterTableRepository
  tableRepo: ITableRepository
  realmRepo: IRealmRepository
}

export type CascadeAction =
  | { kind: 'roll' }
  | { kind: 'rerollAll' }
  | { kind: 'rerollMaster' }
  | { kind: 'rerollEntry' }
  | { kind: 'rerollReaction' }
  | { kind: 'rerollActivity' }
  | { kind: 'rerollNpc' }
  | { kind: 'pickMaster'; category: string }
  | { kind: 'pickEntry'; entryIndex: number }
  | { kind: 'pickReaction'; disposition: Disposition; roll: number }

/**
 * Pure effect binder: wires the domain cascade engine to real dice, reaction
 * rolls, NPC generation, and compendium monster matching for the ctx system.
 * Note: the runtime system id lives on `SystemConfig.id` (e.g. 'system-shadowdark').
 */
export function buildCascadeEffects(
  ctx: CascadeContext,
  deps: CascadeUseCaseDeps,
): CascadeEffects {
  return {
    rollDie: (sides) => rollDice(`1d${sides}`).total,
    rollReaction: () => rollReaction2d6(),
    generateNpc: () =>
      executeGenerateNPC(
        {
          worldId: ctx.worldId,
          systemConfig: ctx.systemConfig,
          regionId: ctx.regionId ?? undefined,
        },
        { tableRepo: deps.tableRepo, realmRepo: deps.realmRepo },
      ),
    matchMonster: (text) => matchCompendiumMonster(text, ctx.systemConfig.id),
    matchLocation: ctx.regionPois ? (text) => matchRegionLocation(text, ctx.regionPois!) : undefined,
    rollActivity: (kind) => {
      const list = kind === 'creature' ? CREATURE_ACTIVITIES : NPC_ACTIVITIES
      const roll = rollDice(`1d${list.length}`).total
      return { text: list[roll - 1], roll }
    },
    now: () => Date.now(),
  }
}

function sectionsOf(ctx: CascadeContext): CascadeSection[] {
  return getActiveSections(ctx.table, { terrain: ctx.terrain, poiType: ctx.poiType })
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
    case 'rerollActivity':
      result = prev ? rerollActivity(prev, fx) : await rollCascade(sections, fx)
      break
    case 'rerollNpc':
      result = prev ? await rerollNpc(prev, fx) : await rollCascade(sections, fx)
      break
    case 'pickMaster':
      result = await pickMaster(action.category, sections, fx)
      break
    case 'pickEntry':
      result = prev ? await pickEntryAt(prev, sections, fx, action.entryIndex) : await rollCascade(sections, fx)
      break
    case 'pickReaction':
      result = prev ? pickReaction(prev, action.disposition, action.roll) : await rollCascade(sections, fx)
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
    await deps.encounterTableRepo.update({
      ...ctx.table,
      lastResult: result,
      updatedAt: Date.now(),
    })
  }
  // If no table row exists yet, the caller (usePOIActions) creates one first
  // and passes it in via ctx.table; see Task 5 wiring.
}
