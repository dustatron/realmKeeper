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
