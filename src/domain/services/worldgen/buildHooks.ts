import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { POI } from '@domain/entities/POI'
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'
import type { Notice } from '@domain/entities/Notice'
import type { Rumor } from '@domain/entities/Rumor'
import { newId } from '@shared/ulid'

export interface HookBundle {
  hooks: Hook[]
  notices: Notice[]
  rumors: Rumor[]
}

// Generates structured quest Hooks from the generated world, plus their public
// projections (Notices/Rumors) placed at real POIs so they roll up to those
// pages. Two deterministic conflict templates, both anchored to existing
// records (no new NPCs):
//  - recovery (missing_person): a faction leader seeks a captive held at a
//    dungeon → request Notice at the leader's HQ + quest Rumor at the dungeon.
//  - revenge: an aggrieved leader (from an enemy connection) wants a rival
//    leader brought down → bounty Notice at the leader's HQ.
export function buildHooks(
  factions: Faction[],
  npcs: NPC[],
  pois: POI[],
  connections: Connection[],
  worldId: string,
  rng: SeededRandom,
): HookBundle {
  const now = Date.now()
  const nameOf = new Map(npcs.map((n) => [n.id, n.name]))
  const poiName = new Map(pois.map((p) => [p.id, p.name]))
  const dungeons = pois.filter((p) => p.type === 'dungeon')

  // Who was taken / who's owed — a personal stake to make hooks read like a plea
  // rather than a clinical record.
  const RELATIONS = [
    'daughter', 'son', 'brother', 'sister', 'apprentice', 'dearest friend',
    'young ward', 'old mentor', 'betrothed', 'only kin',
  ]

  const hooks: Hook[] = []
  const notices: Notice[] = []
  const rumors: Rumor[] = []

  const addNotice = (
    hookId: string,
    poiId: string | null,
    regionId: string | null,
    type: Notice['type'],
    title: string,
    description: string,
    contactNpcId: string | null,
    reward: string,
  ): void => {
    notices.push({
      id: newId(),
      poiId,
      regionId,
      worldId,
      title,
      description,
      type,
      reward,
      contactNpcId,
      hookId,
      isUsed: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    })
  }

  // --- Recovery: one per faction with a leader + HQ, if a dungeon exists. ---
  for (const faction of factions) {
    if (!faction.leaderNpcId || !faction.headquartersPoiId || dungeons.length === 0) continue
    const dungeon = rng.pick(dungeons)
    const dungeonName = poiName.get(dungeon.id) ?? 'a forgotten place'
    const contactName = nameOf.get(faction.leaderNpcId) ?? 'A leader'
    const relation = rng.pick(RELATIONS)
    const hookId = newId()
    hooks.push({
      id: hookId,
      worldId,
      type: 'missing_person',
      title: `Bring my ${relation} home`,
      status: 'open',
      contactNpcId: faction.leaderNpcId,
      rewardText: 'A purse of coin, and the favor of the faction.',
      secret: {
        kind: 'captive',
        targetType: 'poi',
        targetId: dungeon.id,
        detail: `“They took my ${relation} into ${dungeonName}. I cannot follow where they’ve gone — but you can. Bring them back to me alive, and the ${faction.name} will stand in your debt.”`,
      },
      createdAt: now,
      updatedAt: now,
    })
    addNotice(
      hookId,
      faction.headquartersPoiId,
      faction.regionId,
      'request',
      `A plea from ${contactName}`,
      `${contactName} of the ${faction.name} begs for the safe return of their ${relation}, last seen dragged toward ${dungeonName}.`,
      faction.leaderNpcId,
      'A purse of coin, and the favor of the faction.',
    )
    rumors.push({
      id: newId(),
      poiId: dungeon.id,
      regionId: dungeon.regionId ?? null,
      worldId,
      text: `Folk whisper that someone is held within ${dungeonName}, and that ${faction.name} wants them back.`,
      source: 'local talk',
      isUsed: false,
      isQuestHook: true,
      hookId,
      tags: [],
      createdAt: now,
      updatedAt: now,
    })
  }

  // --- Revenge: one per enemy connection between NPCs. ---
  const hqOfLeader = new Map<string, { poiId: string | null; regionId: string | null; faction: string }>()
  for (const f of factions) {
    if (f.leaderNpcId) {
      hqOfLeader.set(f.leaderNpcId, {
        poiId: f.headquartersPoiId,
        regionId: f.regionId,
        faction: f.name,
      })
    }
  }
  for (const conn of connections) {
    if (conn.kind !== 'enemy' || conn.fromType !== 'npc' || conn.toType !== 'npc') continue
    const contactName = nameOf.get(conn.fromId) ?? 'A rival'
    const targetName = nameOf.get(conn.toId) ?? 'a sworn foe'
    const hq = hqOfLeader.get(conn.fromId)
    const hookId = newId()
    hooks.push({
      id: hookId,
      worldId,
      type: 'revenge',
      title: `Settle my score with ${targetName}`,
      status: 'open',
      contactNpcId: conn.fromId,
      rewardText: 'Coin now, and a powerful debt owed.',
      secret: {
        kind: 'culprit',
        targetType: 'npc',
        targetId: conn.toId,
        detail: `“${targetName} has taken from me what cannot be returned. I want them ruined — quietly, and for good. Do this, and you’ll not find me ungrateful.”`,
      },
      createdAt: now,
      updatedAt: now,
    })
    addNotice(
      hookId,
      hq?.poiId ?? null,
      hq?.regionId ?? null,
      'bounty',
      `${contactName} seeks a quiet hand`,
      `Word is that ${contactName} will pay well for someone willing to move against ${targetName}.`,
      conn.fromId,
      'Coin now, and a powerful debt owed.',
    )
  }

  return { hooks, notices, rumors }
}
