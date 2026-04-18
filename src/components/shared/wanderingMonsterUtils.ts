import { getCompendiumById } from '@domain/data/compendium'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { CompendiumEntry, CompendiumMonster } from '@domain/entities/Compendium'
import type { NPC } from '@domain/entities/NPC'

export function getMonsterStats(compendiumId: string | null): CompendiumMonster | null {
  if (!compendiumId) return null
  const entry = getCompendiumById(compendiumId)
  if (!entry || entry.kind !== 'monster') return null
  return entry as CompendiumMonster
}

export function formatAC(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return String(d.data.armorClass)
  if (d.system === 'custom') return d.data.ac != null ? String(d.data.ac) : '—'
  if (d.system === 'cairn') {
    const m = d.data.stats.match(/(\d+)\s*armor/i)
    return m ? m[1] : '—'
  }
  return '—'
}

export function formatHP(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return String(d.data.hitPoints)
  if (d.system === 'custom') return d.data.hp != null ? String(d.data.hp) : '—'
  if (d.system === 'cairn') {
    const m = d.data.stats.match(/(\d+)\s*hp/i)
    return m ? m[1] : '—'
  }
  return '—'
}

export function formatAtk(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return d.data.attacks.split(',')[0]?.trim() ?? d.data.attacks
  if (d.system === 'custom') return d.data.attacks || '—'
  if (d.system === 'cairn') return d.data.details[0]?.split('.')[0] ?? '—'
  return '—'
}

export function entryAC(entry: WanderingMonsterEntry): string {
  const monster = getMonsterStats(entry.compendiumId)
  if (monster) return formatAC(monster)
  if (entry.customStats?.ac != null) return String(entry.customStats.ac)
  return '—'
}

export function entryHP(entry: WanderingMonsterEntry): string {
  const monster = getMonsterStats(entry.compendiumId)
  if (monster) return formatHP(monster)
  if (entry.customStats?.hp != null) return String(entry.customStats.hp)
  return '—'
}

export function entryAtk(entry: WanderingMonsterEntry): string {
  const monster = getMonsterStats(entry.compendiumId)
  if (monster) return formatAtk(monster)
  if (entry.customStats?.attacks) return entry.customStats.attacks
  return '—'
}

export function npcToCustomStats(npc: NPC) {
  const sb = npc.systemBlock
  if (!sb) return null
  const atkStr = sb.attacks.length > 0
    ? sb.attacks.map((a) => `${a.name} ${a.damage}`).join(', ')
    : ''
  return {
    ac: sb.armor || null,
    hp: sb.hp || null,
    attacks: atkStr,
  }
}

export function entrySource(entry: WanderingMonsterEntry): string {
  if (entry.npcId) return 'Denizen'
  if (entry.compendiumId) {
    return getCompendiumById(entry.compendiumId) ? 'Core Rules' : 'Custom Monster'
  }
  return 'Custom'
}

export function bestiaryEntryToWandering(entry: CompendiumEntry): WanderingMonsterEntry {
  const isBuiltIn = !!getCompendiumById(entry.id)
  let customStats: WanderingMonsterEntry['customStats'] = null
  if (!isBuiltIn && entry.kind === 'monster') {
    const m = entry as CompendiumMonster
    const d = m.systemData
    if (d.system === 'custom') {
      customStats = { ac: d.data.ac ?? null, hp: d.data.hp ?? null, attacks: d.data.attacks || '' }
    } else if (d.system === 'shadowdark') {
      customStats = { ac: d.data.armorClass, hp: d.data.hitPoints, attacks: d.data.attacks }
    } else if (d.system === 'cairn') {
      const acM = d.data.stats.match(/(\d+)\s*armor/i)
      const hpM = d.data.stats.match(/(\d+)\s*hp/i)
      customStats = { ac: acM ? parseInt(acM[1]) : null, hp: hpM ? parseInt(hpM[1]) : null, attacks: d.data.details[0]?.split('.')[0] ?? '' }
    }
  }
  return { name: entry.name, creatureType: 'monster', count: '1', activity: '', compendiumId: entry.id, npcId: null, customStats }
}
