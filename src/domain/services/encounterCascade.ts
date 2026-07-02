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
  /** creature/npc "what they're doing" secondary roll (see spec Decision A1) */
  rollActivity?: (kind: 'creature' | 'npc') => { text: string; roll: number }
  now: () => number
}

/** Matches a trailing chain token: {creature}, {npc}, or {creature|npc}. */
const CHAIN_TOKEN = /\s*\{(creature\|npc|creature|npc)\}\s*$/i

/**
 * Split an areaEffect entry into its display text and any chain token. The token
 * flags that the effect flushes out a creature/NPC (auto-chained, spec Decision B).
 */
export function parseChainToken(text: string): {
  text: string
  token: 'creature' | 'npc' | 'either' | null
} {
  const m = text.match(CHAIN_TOKEN)
  if (!m) return { text, token: null }
  const raw = m[1].toLowerCase()
  const token = raw === 'creature' ? 'creature' : raw === 'npc' ? 'npc' : 'either'
  return { text: text.replace(CHAIN_TOKEN, '').trim(), token }
}

function pickEntry(section: CascadeSection, fx: CascadeEffects): { entryText: string; entryIndex: number } {
  if (section.entries.length === 0) return { entryText: '(empty)', entryIndex: 0 }
  const entryIndex = fx.rollDie(section.entries.length) - 1
  return { entryText: section.entries[entryIndex] ?? section.entries[0], entryIndex }
}

/** Roll a full follow-up encounter on the creature/npc section flushed out by a token. */
async function rollChained(
  token: 'creature' | 'npc' | 'either',
  sections: CascadeSection[],
  fx: CascadeEffects,
): Promise<EncounterRollResult | null> {
  const target = token === 'either' ? (fx.rollDie(2) === 1 ? 'creature' : 'npc') : token
  const idx = sections.findIndex((s) => s.category === target)
  if (idx < 0) return null
  // Chained sections never chain again (only areaEffect carries tokens).
  return buildResult(idx + 1, sections[idx], sections, fx)
}

async function buildResult(
  masterRoll: number,
  section: CascadeSection,
  sections: CascadeSection[],
  fx: CascadeEffects,
  preservedReaction?: { roll: number; disposition: Disposition },
  forcedEntryIndex?: number,
): Promise<EncounterRollResult> {
  const { entryText, entryIndex } =
    forcedEntryIndex != null && section.entries[forcedEntryIndex] != null
      ? { entryText: section.entries[forcedEntryIndex], entryIndex: forcedEntryIndex }
      : pickEntry(section, fx)
  const base: EncounterRollResult = {
    masterRoll,
    category: section.category,
    categoryLabel: section.label,
    entryIndex,
    entryText,
    rolledAt: fx.now(),
  }

  if (section.category === 'npc') {
    // An NPC encounter is fully represented by the generated NPC card, which
    // carries its own disposition — no archetype entry text or separate 2d6
    // reaction. Use the NPC's name as the one-line result summary.
    const npc = await fx.generateNpc()
    const activity = fx.rollActivity?.('npc')
    return {
      ...base,
      entryText: npc.name,
      npc,
      npcSavedId: null,
      activity: activity?.text,
      activityRoll: activity?.roll,
    }
  }

  if (section.category === 'creature') {
    const reaction = preservedReaction ?? fx.rollReaction()
    const activity = fx.rollActivity?.('creature')
    return {
      ...base,
      reaction: reaction.disposition,
      reactionRoll: reaction.roll,
      monsterMatch: fx.matchMonster(entryText),
      activity: activity?.text,
      activityRoll: activity?.roll,
    }
  }

  if (section.category === 'areaEffect') {
    const { text, token } = parseChainToken(entryText)
    const result: EncounterRollResult = { ...base, entryText: text }
    if (token) result.chained = await rollChained(token, sections, fx)
    return result
  }

  if (section.category === 'signOmen') {
    return { ...base, locationMatch: fx.matchLocation?.(entryText) ?? null }
  }
  return base
}

export async function rollCascade(sections: CascadeSection[], fx: CascadeEffects): Promise<EncounterRollResult> {
  if (sections.length === 0) throw new Error('rollCascade: no active sections')
  const masterRoll = fx.rollDie(sections.length)
  return buildResult(masterRoll, sections[masterRoll - 1], sections, fx)
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
  return buildResult(prev.masterRoll, section, sections, fx, preserved)
}

export function rerollReaction(prev: EncounterRollResult, fx: CascadeEffects): EncounterRollResult {
  // Only creatures roll a separate reaction; NPCs use their own disposition.
  if (prev.category !== 'creature') return prev
  const reaction = fx.rollReaction()
  return { ...prev, reaction: reaction.disposition, reactionRoll: reaction.roll }
}

/** Re-roll only "what they're doing" for a creature/npc result. */
export function rerollActivity(prev: EncounterRollResult, fx: CascadeEffects): EncounterRollResult {
  if (prev.category !== 'creature' && prev.category !== 'npc') return prev
  const activity = fx.rollActivity?.(prev.category)
  if (!activity) return prev
  return { ...prev, activity: activity.text, activityRoll: activity.roll }
}

export async function rerollNpc(prev: EncounterRollResult, fx: CascadeEffects): Promise<EncounterRollResult> {
  if (prev.category !== 'npc') return prev
  const npc = await fx.generateNpc()
  return { ...prev, npc, entryText: npc.name, npcSavedId: null }
}

/**
 * Manually select a master section (clicking its row): land on that category and
 * roll an entry within it (or generate the NPC, for the npc category).
 */
export async function pickMaster(
  category: string,
  sections: CascadeSection[],
  fx: CascadeEffects,
): Promise<EncounterRollResult> {
  const idx = sections.findIndex((s) => s.category === category)
  if (idx < 0) return rollCascade(sections, fx)
  return buildResult(idx + 1, sections[idx], sections, fx)
}

/**
 * Manually select a specific entry within the current section (clicking its row):
 * keep the master/category and force the chosen entry, preserving any reaction.
 */
export async function pickEntryAt(
  prev: EncounterRollResult,
  sections: CascadeSection[],
  fx: CascadeEffects,
  entryIndex: number,
): Promise<EncounterRollResult> {
  const section = sections.find((s) => s.category === prev.category)
  if (!section) return rollCascade(sections, fx)
  const preserved =
    prev.reaction && prev.reactionRoll != null
      ? { roll: prev.reactionRoll, disposition: prev.reaction }
      : undefined
  return buildResult(prev.masterRoll, section, sections, fx, preserved, entryIndex)
}

/** Manually select a creature reaction (clicking its row). */
export function pickReaction(
  prev: EncounterRollResult,
  disposition: Disposition,
  roll: number,
): EncounterRollResult {
  if (prev.category !== 'creature') return prev
  return { ...prev, reaction: disposition, reactionRoll: roll }
}
