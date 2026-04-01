import { searchCompendium, getCompendiumById, getMonstersBySystemId, getEquipmentBySystemId, getSpellsBySystemId, getMagicItemsBySystemId } from '@domain/data/compendium'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { SeededRandom } from './SeededRandom'

const CONDITIONS = ['rusty', 'battered', 'worn', 'cracked', 'well-used', 'new', 'masterwork']

/** Pick a random weapon from the system compendium */
export function pickWeapon(systemId: string, rng: SeededRandom): { name: string; condition: string; damage: string } | null {
  const equipment = getEquipmentBySystemId(systemId)
  const weapons = equipment.filter((e) => {
    const sd = e.systemData
    if (sd.system === 'shadowdark') return sd.data.itemType === 'weapon'
    if (sd.system === 'cairn') return sd.data.category === 'weapon'
    return false
  })
  if (weapons.length === 0) return null
  const picked = rng.pick(weapons)
  const condition = rng.pick(CONDITIONS)
  const damage = picked.systemData.system === 'shadowdark'
    ? picked.systemData.data.damage ?? ''
    : picked.systemData.system === 'cairn'
    ? picked.systemData.data.damage ?? ''
    : ''
  return { name: picked.name, condition, damage }
}

/** Pick a random piece of gear (armor, tools) from the system compendium */
export function pickGear(systemId: string, rng: SeededRandom): { name: string; condition: string } | null {
  const equipment = getEquipmentBySystemId(systemId)
  const gear = equipment.filter((e) => {
    const sd = e.systemData
    if (sd.system === 'shadowdark') return sd.data.itemType !== 'weapon'
    if (sd.system === 'cairn') return sd.data.category === 'armor' || sd.data.category === 'gear'
    return false
  })
  if (gear.length === 0) return null
  const picked = rng.pick(gear)
  const condition = rng.pick(CONDITIONS)
  return { name: picked.name, condition }
}

/** Pick a random spell scroll from the system compendium */
export function pickSpellScroll(systemId: string, rng: SeededRandom): { name: string; description: string } | null {
  const spells = getSpellsBySystemId(systemId)
  if (spells.length === 0) return null
  const picked = rng.pick(spells)
  return { name: `Scroll of ${picked.name}`, description: picked.description }
}

/** Pick a random magic item name from the system compendium */
export function pickMagicItem(systemId: string, rng: SeededRandom): { name: string; description: string } | null {
  const items = getMagicItemsBySystemId(systemId)
  if (items.length > 0) {
    const picked = rng.pick(items)
    return { name: picked.name, description: picked.description }
  }
  // Fallback generic names
  const GENERIC = [
    'Potion of Healing', 'Wand of Sparks', 'Ring of Minor Ward', 'Amulet of Whispers',
    'Cloak of Shadows', 'Dagger of Returning', 'Lens of True Sight', 'Horn of the Fallen',
  ]
  return { name: rng.pick(GENERIC), description: 'A magical item of unknown origin.' }
}

/** Get the compendium description for a monster entry */
export function getMonsterDescription(id: string): string {
  const entry = getCompendiumById(id) as CompendiumMonster | undefined
  return entry?.description ?? ''
}

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
 * depth is used to filter by appropriate level (depth 1 → max level ~3, etc.)
 */
export function resolveCreature(
  slug: string,
  systemId: string,
  rng: SeededRandom,
  depth = 1
): { id: string; name: string } | null {
  const exactId = findCompendiumId(slug, systemId)
  if (exactId) {
    // Verify the exact match isn't way over-leveled for this depth
    const entry = getCompendiumById(exactId) as CompendiumMonster | undefined
    if (entry?.systemData.system === 'shadowdark') {
      const maxLevel = depth * 2 + 1 // depth 1→3, depth 2→5, depth 3→7
      if (entry.systemData.data.level > maxLevel + 2) {
        // Over-leveled — fall through to filtered random pick
      } else {
        return { id: exactId, name: slugToName(slug) }
      }
    } else {
      return { id: exactId, name: slugToName(slug) }
    }
  }

  if (!_cache.has(systemId)) _cache.set(systemId, getMonstersBySystemId(systemId))
  const allMonsters = _cache.get(systemId)!
  if (allMonsters.length === 0) return null

  // Filter by appropriate level for the dungeon depth
  const maxLevel = depth * 2 + 1
  const levelFiltered = allMonsters.filter((m) => {
    if (m.systemData.system === 'shadowdark') return m.systemData.data.level <= maxLevel
    if (m.systemData.system === 'cairn') {
      // Estimate from HP in the stats string
      const hp = parseInt(m.systemData.data.stats?.match(/(\d+)\s*HP/i)?.[1] ?? '99')
      return hp <= maxLevel * 6 // rough proxy
    }
    return true
  })

  const pool = levelFiltered.length > 0 ? levelFiltered : allMonsters
  const picked = rng.pick(pool)
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
