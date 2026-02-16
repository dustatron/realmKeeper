import type { CompendiumEntry, CompendiumMonster, CompendiumSpell, CompendiumMagicItem, CompendiumEquipment, CompendiumKind } from '@domain/entities/Compendium'
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
