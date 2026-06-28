import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export interface LeadTarget {
  kind: 'item' | 'landmark'
  // item:
  itemId?: string
  itemName?: string
  isMagic?: boolean
  containerType?: 'poi' | 'npc'
  containerId?: string
  // landmark:
  landmarkPoiId?: string
  secret?: string
  regionId: string | null
}

export interface LeadSource {
  kind: 'tavern' | 'npc' | 'note' | 'notice'
  poiId?: string      // tavern/note/notice placement POI
  npcId?: string      // npc-knowledge placement NPC
  isSettlement?: boolean
}

export interface LeadPlan {
  target: LeadTarget
  source: LeadSource
}

const SOURCE_WEIGHTS: Array<{ kind: LeadSource['kind']; w: number }> = [
  { kind: 'tavern', w: 0.4 },
  { kind: 'note', w: 0.3 },
  { kind: 'npc', w: 0.2 },
  { kind: 'notice', w: 0.1 },
]

function holderId(t: LeadTarget): string | undefined {
  return t.kind === 'landmark' ? t.landmarkPoiId : t.containerId
}

export function planTreasureLeads(
  targets: LeadTarget[],
  sources: { settlements: LeadSource[]; npcs: LeadSource[]; otherSites: LeadSource[] },
  rng: SeededRandom,
  opts: { perSettlementCap?: number } = {},
): LeadPlan[] {
  const cap = opts.perSettlementCap ?? 3
  const settlementCount = new Map<string, number>()
  const plans: LeadPlan[] = []

  const candidatesFor = (kind: LeadSource['kind'], t: LeadTarget): LeadSource[] => {
    const hid = holderId(t)
    if (kind === 'npc') return sources.npcs.filter((s) => s.npcId !== hid)
    if (kind === 'note') return sources.otherSites.filter((s) => s.poiId !== hid)
    // tavern/notice → settlements, honoring the cap and not the target's own POI
    return sources.settlements.filter(
      (s) => s.kind === kind && s.poiId !== hid && (settlementCount.get(s.poiId!) ?? 0) < cap,
    )
  }

  for (const t of targets) {
    const leadCount = rng.between(1, 2)
    for (let i = 0; i < leadCount; i++) {
      // Build a weighted ordering: each kind appears proportionally, then shuffle
      const kindList: LeadSource['kind'][] = SOURCE_WEIGHTS.flatMap((e) =>
        Array<LeadSource['kind']>(Math.round(e.w * 10)).fill(e.kind),
      )
      const order = rng.shuffle(kindList)
      let placed = false
      for (const kind of order) {
        const cands = candidatesFor(kind, t)
        if (cands.length === 0) continue
        const src = rng.pick(cands)
        if (src.kind === 'tavern' || src.kind === 'notice') {
          settlementCount.set(src.poiId!, (settlementCount.get(src.poiId!) ?? 0) + 1)
        }
        plans.push({ target: t, source: src })
        placed = true
        break
      }
      if (!placed) break // no eligible placement for this target
    }
  }
  return plans
}
