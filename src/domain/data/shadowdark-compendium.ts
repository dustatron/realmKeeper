import type {
  CompendiumMonster,
  CompendiumSpell,
  CompendiumMagicItem,
  CompendiumEquipment,
} from '@domain/entities/Compendium'
import rawMonsters from '../../ttrpg-systems/shadowdark/monsters.json'
import rawSpells from '../../ttrpg-systems/shadowdark/spells.json'
import rawWitchSpells from '../../ttrpg-systems/shadowdark/witch_spells.json'
import rawMagicItems from '../../ttrpg-systems/shadowdark/magic-items.json'
import rawEquipment from '../../ttrpg-systems/shadowdark/equipment.json'

const SYSTEM_ID = 'system-shadowdark'

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
}

// --- Monsters ---

export const shadowdarkMonsters: CompendiumMonster[] = (rawMonsters as any[]).map((m) => ({
  id: `sd-monster-${m.slug}`,
  systemId: SYSTEM_ID,
  name: m.name,
  description: m.description,
  kind: 'monster' as const,
  systemData: {
    system: 'shadowdark' as const,
    data: {
      slug: m.slug,
      armorClass: m.armor_class,
      armorType: m.armor_type,
      hitPoints: m.hit_points,
      attacks: m.attacks,
      movement: m.movement,
      strength: m.strength,
      dexterity: m.dexterity,
      constitution: m.constitution,
      intelligence: m.intelligence,
      wisdom: m.wisdom,
      charisma: m.charisma,
      alignment: m.alignment,
      level: m.level,
      traits: m.traits ?? [],
    },
  },
}))

// --- Spells (merged with witch spells) ---

function mergeSpells(): CompendiumSpell[] {
  const spellMap = new Map<string, CompendiumSpell>()

  for (const s of rawSpells as any[]) {
    spellMap.set(s.name.toLowerCase(), {
      id: `sd-spell-${s.slug}`,
      systemId: SYSTEM_ID,
      name: s.name,
      description: s.description,
      kind: 'spell' as const,
      systemData: {
        system: 'shadowdark' as const,
        data: {
          slug: s.slug,
          classes: [...s.classes],
          duration: s.duration,
          range: s.range,
          tier: s.tier,
        },
      },
    })
  }

  for (const ws of rawWitchSpells as any[]) {
    const key = ws.name.toLowerCase()
    const existing = spellMap.get(key)
    if (existing && existing.systemData.system === 'shadowdark') {
      const data = existing.systemData.data
      if (!data.classes.includes('witch')) data.classes.push('witch')
    } else {
      const normalizedSlug = slug(ws.name)
      spellMap.set(key, {
        id: `sd-spell-${normalizedSlug}`,
        systemId: SYSTEM_ID,
        name: toTitleCase(ws.name),
        description: ws.description,
        kind: 'spell' as const,
        systemData: {
          system: 'shadowdark' as const,
          data: {
            slug: normalizedSlug,
            classes: ['witch'],
            duration: ws.duration,
            range: ws.range,
            tier: ws.tier,
          },
        },
      })
    }
  }

  return Array.from(spellMap.values())
}

export const shadowdarkSpells: CompendiumSpell[] = mergeSpells()

// --- Magic Items ---

export const shadowdarkMagicItems: CompendiumMagicItem[] = (rawMagicItems as any[]).map((item) => ({
  id: `sd-magic-item-${item.slug}`,
  systemId: SYSTEM_ID,
  name: item.name,
  description: item.description,
  kind: 'magicItem' as const,
  systemData: {
    system: 'shadowdark' as const,
    data: {
      slug: item.slug,
      traits: item.traits ?? [],
    },
  },
}))

// --- Equipment ---

export const shadowdarkEquipment: CompendiumEquipment[] = (rawEquipment as any[]).map((e) => ({
  id: `sd-equipment-${slug(e.name)}`,
  systemId: SYSTEM_ID,
  name: e.name,
  description: `${e.itemType} — ${e.cost.amount} ${e.cost.currency}`,
  kind: 'equipment' as const,
  systemData: {
    system: 'shadowdark' as const,
    data: {
      uuid: e.uuid,
      cost: e.cost,
      attackType: e.attackType ?? null,
      range: e.range ?? null,
      damage: e.damage ?? null,
      properties: e.properties ?? [],
      slot: e.slot,
      itemType: e.itemType,
    },
  },
}))
