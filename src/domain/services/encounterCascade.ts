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
  matchLocation?: (text: string) => { poiId: string; name: string } | null
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

  if (section.category === 'signOmen' || section.category === 'discovery') {
    return { ...base, locationMatch: fx.matchLocation?.(entryText) ?? null }
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
