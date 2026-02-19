/** Tag-to-emoji mapping for dungeon room cards */
const TAG_EMOJIS: Record<string, string> = {
  boss: '💀',
  ambush: '🎯',
  puzzle: '🧩',
  secret: '🔮',
  locked: '🔒',
  shrine: '⛩️',
  safe: '🛡️',
}

/** Tags that are covered by data-driven icons (traps/treasure) and shouldn't double-show */
const DATA_DRIVEN_TAGS = new Set(['trap', 'hazard', 'treasure', 'dungeon-room'])

/** Returns emoji array for tags that have mappings */
export function getTagEmojis(tags: string[]): string[] {
  const emojis: string[] = []
  for (const tag of tags) {
    const lower = tag.toLowerCase()
    if (TAG_EMOJIS[lower]) emojis.push(TAG_EMOJIS[lower])
  }
  return emojis
}

/** Returns tags that don't have emoji mappings and aren't data-driven (for badge display) */
export function getUnmappedTags(tags: string[]): string[] {
  return tags.filter(
    (tag) => !TAG_EMOJIS[tag.toLowerCase()] && !DATA_DRIVEN_TAGS.has(tag.toLowerCase()),
  )
}
