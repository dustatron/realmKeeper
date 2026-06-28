import { getCompendiumById } from '@domain/data/compendium'

export function compendiumHref(
  compendiumId: string | null | undefined
): { to: string; params: Record<string, string> } | null {
  if (!compendiumId) return null
  const e = getCompendiumById(compendiumId)
  if (!e) return null
  switch (e.kind) {
    case 'monster':
      return { to: '/realms/compendium/monsters/$monsterId', params: { monsterId: compendiumId } }
    case 'magicItem':
      return { to: '/realms/compendium/magic-items/$itemId', params: { itemId: compendiumId } }
    case 'equipment':
      return { to: '/realms/compendium/equipment/$equipmentId', params: { equipmentId: compendiumId } }
    case 'spell':
      return { to: '/realms/compendium/spells/$spellId', params: { spellId: compendiumId } }
    default:
      return null
  }
}
