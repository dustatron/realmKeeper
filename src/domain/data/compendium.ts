import type { CompendiumEntry, CompendiumMonster, CompendiumSpell, CompendiumMagicItem, CompendiumEquipment, CompendiumKind, CustomCompendiumEquipmentData } from '@domain/entities/Compendium'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'
import { cairnMonsters, cairnSpells, cairnMagicItems, cairnEquipment } from './cairn-compendium'
import { shadowdarkMonsters, shadowdarkSpells, shadowdarkMagicItems, shadowdarkEquipment } from './shadowdark-compendium'

// Aggregate arrays
const allMonsters: CompendiumMonster[] = [...cairnMonsters, ...shadowdarkMonsters]
const allSpells: CompendiumSpell[] = [...cairnSpells, ...shadowdarkSpells]
const allMagicItems: CompendiumMagicItem[] = [...cairnMagicItems, ...shadowdarkMagicItems]
const allEquipment: CompendiumEquipment[] = [...cairnEquipment, ...shadowdarkEquipment]
const allEntries: CompendiumEntry[] = [...allMonsters, ...allSpells, ...allMagicItems, ...allEquipment]

// O(1) lookup map
const entryById = new Map<string, CompendiumEntry>(allEntries.map((e) => [e.id, e]))

// Lookup functions
export function getCompendiumById(id: string): CompendiumEntry | undefined {
  return entryById.get(id)
}

export function getMonstersBySystemId(systemId: string): CompendiumMonster[] {
  return allMonsters.filter((m) => m.systemId === systemId)
}

export function getSpellsBySystemId(systemId: string): CompendiumSpell[] {
  return allSpells.filter((s) => s.systemId === systemId)
}

export function getMagicItemsBySystemId(systemId: string): CompendiumMagicItem[] {
  return allMagicItems.filter((i) => i.systemId === systemId)
}

export function getEquipmentBySystemId(systemId: string): CompendiumEquipment[] {
  return allEquipment.filter((e) => e.systemId === systemId)
}

export function searchCompendium(query: string, systemId?: string, kind?: CompendiumKind): CompendiumEntry[] {
  const q = query.toLowerCase()
  return allEntries.filter((e) => {
    if (systemId && e.systemId !== systemId) return false
    if (kind && e.kind !== kind) return false
    return e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
  })
}

// --- Custom entry adapters ---

export function customEntryToMonster(e: CustomCompendiumEntry): CompendiumMonster {
  return {
    id: e.id,
    systemId: 'custom',
    name: e.name,
    description: e.description,
    kind: 'monster',
    systemData: {
      system: 'custom',
      data: e.monsterData ?? { ac: null, hp: null, speed: '', attacks: '', abilities: '', cr: '' },
    },
  }
}

export function customEntryToSpell(e: CustomCompendiumEntry): CompendiumSpell {
  return {
    id: e.id,
    systemId: 'custom',
    name: e.name,
    description: e.description,
    kind: 'spell',
    systemData: {
      system: 'custom',
      data: e.spellData ?? { level: '', school: '', castingTime: '', range: '', duration: '', components: '', classes: [] },
    },
  }
}

export function customEntryToMagicItem(e: CustomCompendiumEntry): CompendiumMagicItem {
  return {
    id: e.id,
    systemId: 'custom',
    name: e.name,
    description: e.description,
    kind: 'magicItem',
    systemData: {
      system: 'custom',
      data: e.magicItemData ?? { rarity: '', itemType: '', attunement: false, charges: null, properties: [] },
    },
  }
}

export function customEntryToEquipment(e: CustomCompendiumEntry): CompendiumEquipment {
  return {
    id: e.id,
    systemId: 'custom',
    name: e.name,
    description: e.description,
    kind: 'equipment',
    systemData: {
      system: 'custom',
      data: e.equipmentData ?? { cost: '', weight: '', category: '', damage: '', properties: [] },
    },
  }
}

export function customEntryToCompendiumEntry(e: CustomCompendiumEntry): CompendiumEntry {
  if (e.kind === 'monster') return customEntryToMonster(e)
  if (e.kind === 'spell') return customEntryToSpell(e)
  if (e.kind === 'equipment') return customEntryToEquipment(e)
  return customEntryToMagicItem(e)
}

/** Search custom entries the same way as system entries */
export function searchCustomEntries(
  entries: CustomCompendiumEntry[],
  query: string,
  kind?: CompendiumKind
): CompendiumEntry[] {
  const q = query.toLowerCase()
  return entries
    .filter((e) => {
      if (kind && e.kind !== kind) return false
      return e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    })
    .map(customEntryToCompendiumEntry)
}
