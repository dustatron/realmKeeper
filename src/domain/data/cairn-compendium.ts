import type { CompendiumMonster, CompendiumSpell, CompendiumMagicItem, CompendiumEquipment } from '@domain/entities/Compendium'
import { monsters as rawMonsters } from '../../ttrpg-systems/cairn/cairn-monsters'
import rawSpells from '../../ttrpg-systems/cairn/cairn-spells.json'
import rawMagicItems from '../../ttrpg-systems/cairn/cairn-magic-items.json'
import rawEquipment from '../../ttrpg-systems/cairn/cairn-equipment.json'

const SYSTEM_ID = 'system-cairn-2e'

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Parse charges/uses from title like "Name, 3 charges" or "Name, 1 use"
function parseCharges(title: string): { name: string; charges: string | null } {
  const match = title.match(/^(.+?),\s*(\d+\s+(?:charges?|uses?))\s*$/i)
  if (match) return { name: match[1].trim(), charges: match[2] }
  return { name: title, charges: null }
}

export const cairnMonsters: CompendiumMonster[] = (rawMonsters as { title: string; stats: string; details: string[] }[]).map((m) => ({
  id: `cairn-monster-${slug(m.title)}`,
  systemId: SYSTEM_ID,
  name: m.title,
  description: m.stats,
  kind: 'monster' as const,
  systemData: { system: 'cairn' as const, data: { stats: m.stats, details: m.details } },
}))

export const cairnSpells: CompendiumSpell[] = (rawSpells as { number: string; title: string; description: string }[]).map((s) => ({
  id: `cairn-spell-${slug(s.title)}`,
  systemId: SYSTEM_ID,
  name: s.title,
  description: s.description,
  kind: 'spell' as const,
  systemData: { system: 'cairn' as const, data: { number: s.number } },
}))

export const cairnMagicItems: CompendiumMagicItem[] = (rawMagicItems as { id: string; title: string; details: string[]; recharge: string }[]).map((item) => {
  const { name, charges } = parseCharges(item.title)
  return {
    id: `cairn-magic-item-${slug(name)}`,
    systemId: SYSTEM_ID,
    name,
    description: item.details.join(' ').replace(/<[^>]*>/g, '').slice(0, 200),
    kind: 'magicItem' as const,
    systemData: { system: 'cairn' as const, data: { details: item.details, recharge: item.recharge, charges } },
  }
})

export const cairnEquipment: CompendiumEquipment[] = (rawEquipment as { name: string; cost: number; category: string; damage: string | null; armor: number | null; properties: string[]; slots: number | null }[]).map((e) => ({
  id: `cairn-equipment-${slug(e.name)}`,
  systemId: SYSTEM_ID,
  name: e.name,
  description: `${e.category} — ${e.cost} gp`,
  kind: 'equipment' as const,
  systemData: { system: 'cairn' as const, data: { cost: e.cost, category: e.category, damage: e.damage, armor: e.armor, properties: e.properties, slots: e.slots } },
}))
