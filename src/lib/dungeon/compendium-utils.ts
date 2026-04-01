import { searchCompendium, getCompendiumById, getMonstersBySystemId } from '@domain/data/compendium'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { SeededRandom } from './SeededRandom'

export function slugToName(slug: string): string {
  return slug.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function findCompendiumId(slug: string, systemId: string): string | null {
  const results = searchCompendium(slugToName(slug), systemId, 'monster')
  return results[0]?.id ?? null
}

// Cache per systemId to avoid rebuilding on every call
const _cache = new Map<string, CompendiumMonster[]>()

/**
 * Resolve a creature slug to a compendium entry.
 * Falls back to a random real system monster if no name match found.
 */
export function resolveCreature(
  slug: string,
  systemId: string,
  rng: SeededRandom
): { id: string; name: string } | null {
  const exactId = findCompendiumId(slug, systemId)
  if (exactId) return { id: exactId, name: slugToName(slug) }

  if (!_cache.has(systemId)) _cache.set(systemId, getMonstersBySystemId(systemId))
  const monsters = _cache.get(systemId)!
  if (monsters.length === 0) return null

  const picked = rng.pick(monsters)
  return { id: picked.id, name: picked.name }
}

export function emptySystemBlock(): SystemBlock {
  return { stats: [], hp: 0, maxHp: 0, armor: 0, attacks: [], inventory: [], abilities: [], notes: '' }
}

export function systemBlockFromMonster(id: string): SystemBlock {
  const entry = getCompendiumById(id) as CompendiumMonster | undefined
  if (!entry) return emptySystemBlock()

  const sd = entry.systemData

  if (sd.system === 'shadowdark') {
    const d = sd.data
    return {
      stats: [
        { key: 'STR', value: d.strength },
        { key: 'DEX', value: d.dexterity },
        { key: 'CON', value: d.constitution },
        { key: 'INT', value: d.intelligence },
        { key: 'WIS', value: d.wisdom },
        { key: 'CHA', value: d.charisma },
      ],
      hp: d.hitPoints,
      maxHp: d.hitPoints,
      armor: d.armorClass,
      level: d.level,
      attacks: d.attacks ? [{ name: 'Attack', damage: d.attacks, description: '' }] : [],
      inventory: [],
      abilities: d.traits?.map((t) => `${t.name}: ${t.description}`) ?? [],
      notes: [d.armorType, d.movement, d.alignment].filter(Boolean).join(' | '),
    }
  }

  if (sd.system === 'cairn') {
    const d = sd.data
    const s = d.stats ?? ''
    const hp    = parseInt(s.match(/(\d+)\s*HP/i)?.[1]    ?? '0')
    const armor = parseInt(s.match(/(\d+)\s*Armor/i)?.[1] ?? '0')
    const str   = parseInt(s.match(/(\d+)\s*STR/i)?.[1]   ?? '0')
    const dex   = parseInt(s.match(/(\d+)\s*DEX/i)?.[1]   ?? '0')
    const wil   = parseInt(s.match(/(\d+)\s*WIL/i)?.[1]   ?? '0')
    const attackMatch = s.match(/([^,]+\([\dd+]+\))[^,]*$/)
    const attackStr   = attackMatch?.[1]?.trim() ?? ''
    const attackName   = attackStr.includes('(') ? attackStr.slice(0, attackStr.indexOf('(')).trim() : attackStr
    const attackDamage = attackStr.match(/\(([\dd+]+)\)/)?.[1] ?? ''
    return {
      stats: [
        ...(str > 0 ? [{ key: 'STR', value: str }] : []),
        ...(dex > 0 ? [{ key: 'DEX', value: dex }] : []),
        ...(wil > 0 ? [{ key: 'WIL', value: wil }] : []),
      ],
      hp, maxHp: hp, armor,
      attacks: attackDamage ? [{ name: attackName || 'Attack', damage: attackDamage, description: '' }] : [],
      inventory: [],
      abilities: d.details ?? [],
      notes: s,
    }
  }

  return emptySystemBlock()
}

/**
 * Fallback stat block scaled by dungeon depth + danger level.
 * Uses system-appropriate stat ranges (Cairn vs Shadowdark).
 */
export function fallbackSystemBlock(depth: number, dangerLevel: string, systemId = ''): SystemBlock {
  const dangerBonus = ({ low: -1, medium: 0, deadly: 1, very_deadly: 2 } as Record<string, number>)[dangerLevel] ?? 0
  const tier = Math.max(0, Math.min(3, (depth - 1) + dangerBonus))
  const isCairn = systemId.toLowerCase().includes('cairn')

  const cairnTiers = [
    { hp: 3,  armor: 0, attack: 'd6',  level: 1, note: 'Weak creature'      },
    { hp: 6,  armor: 1, attack: 'd6',  level: 2, note: 'Average creature'   },
    { hp: 10, armor: 2, attack: 'd8',  level: 4, note: 'Tough creature'     },
    { hp: 14, armor: 3, attack: 'd10', level: 6, note: 'Dangerous creature' },
  ]
  const shadowdarkTiers = [
    { hp: 4,  armor: 11, attack: '1d6',  level: 1, note: 'Weak creature'      },
    { hp: 10, armor: 13, attack: '1d8',  level: 2, note: 'Average creature'   },
    { hp: 16, armor: 15, attack: '1d10', level: 4, note: 'Tough creature'     },
    { hp: 24, armor: 17, attack: '1d12', level: 6, note: 'Dangerous creature' },
  ]

  const t = (isCairn ? cairnTiers : shadowdarkTiers)[tier]
  return {
    stats: [],
    hp: t.hp, maxHp: t.hp, armor: t.armor, level: t.level,
    attacks: [{ name: 'Attack', damage: t.attack, description: '' }],
    inventory: [], abilities: [], notes: t.note,
  }
}
