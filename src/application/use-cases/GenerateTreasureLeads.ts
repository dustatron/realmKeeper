import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { IHookRepository } from '@application/ports/IHookRepository'
import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { Hook } from '@domain/entities/Hook'
import type { Rumor } from '@domain/entities/Rumor'
import type { Notice } from '@domain/entities/Notice'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { newId } from '@shared/ulid'
import { planTreasureLeads, type LeadTarget, type LeadSource } from '@domain/services/worldgen/treasureLeads'

export interface GenerateTreasureLeadsInput {
  worldId: string
  seed: string
}

export interface GenerateTreasureLeadsDeps {
  poiRepo: IPOIRepository
  npcRepo: INPCRepository
  regionRepo: IRegionRepository
  hookRepo: IHookRepository
  rumorRepo: IRumorRepository
  noticeRepo: INoticeRepository
  factionRepo: IFactionRepository
}

export async function executeGenerateTreasureLeads(
  input: GenerateTreasureLeadsInput,
  deps: GenerateTreasureLeadsDeps,
): Promise<void> {
  // Load POIs via region iteration (IPOIRepository has no getByRealmId)
  const regions = await deps.regionRepo.getByRealmId(input.worldId)
  const pois = (await Promise.all(regions.map((r) => deps.poiRepo.getByRegionId(r.id)))).flat()
  const npcs = await deps.npcRepo.getByRealmId(input.worldId)

  const poiName = new Map(pois.map((p) => [p.id, p.name]))
  const npcName = new Map(npcs.map((n) => [n.id, n.name]))

  // Collect pointable targets
  const targets: LeadTarget[] = []

  for (const p of pois) {
    for (const t of p.treasure) {
      if (t.notable || t.isMagic) {
        targets.push({
          kind: 'item',
          itemId: t.id,
          itemName: t.name,
          isMagic: !!t.isMagic,
          containerType: 'poi',
          containerId: p.id,
          regionId: p.regionId,
        })
      }
    }
    if (p.type === 'landmark' && p.landmarkLore?.secret) {
      targets.push({
        kind: 'landmark',
        landmarkPoiId: p.id,
        secret: p.landmarkLore.secret,
        regionId: p.regionId,
      })
    }
  }

  for (const n of npcs) {
    for (const it of n.systemBlock?.inventory ?? []) {
      if (it.notable || it.compendiumKind === 'magicItem') {
        targets.push({
          kind: 'item',
          itemId: it.id,
          itemName: it.name,
          isMagic: it.compendiumKind === 'magicItem',
          containerType: 'npc',
          containerId: n.id,
          regionId: n.regionId,
        })
      }
    }
  }

  if (targets.length === 0) return

  // Build placement sources
  const settlements: LeadSource[] = pois
    .filter((p) => p.type === 'settlement')
    .flatMap((p) => [
      { kind: 'tavern' as const, poiId: p.id, isSettlement: true },
      { kind: 'notice' as const, poiId: p.id, isSettlement: true },
    ])
  const npcSources: LeadSource[] = npcs.map((n) => ({ kind: 'npc' as const, npcId: n.id }))
  const otherSites: LeadSource[] = pois
    .filter((p) => p.type !== 'settlement')
    .map((p) => ({ kind: 'note' as const, poiId: p.id }))

  const rng = new SeededRandom(input.seed)
  const plans = planTreasureLeads(targets, { settlements, npcs: npcSources, otherSites }, rng)

  const now = Date.now()
  const hooks: Hook[] = []
  const rumors: Rumor[] = []
  const notices: Notice[] = []

  const holderName = (t: LeadTarget): string => {
    if (t.kind === 'landmark') return poiName.get(t.landmarkPoiId!) ?? 'a strange place'
    if (t.containerType === 'npc') return npcName.get(t.containerId!) ?? 'someone'
    return poiName.get(t.containerId!) ?? 'a forgotten place'
  }

  const itemLabel = (t: LeadTarget): string =>
    t.kind === 'landmark' ? 'a hidden secret' : (t.itemName ?? 'something valuable')

  for (const { target, source } of plans) {
    const hookId = newId()

    hooks.push({
      id: hookId,
      worldId: input.worldId,
      type: target.isMagic ? 'artifact' : 'lost_item',
      title: `Recover ${itemLabel(target)}`,
      status: 'open',
      contactNpcId: source.npcId ?? null,
      rewardText: 'Coin, and the gratitude of the one who told you.',
      secret:
        target.kind === 'landmark'
          ? {
              kind: 'truth',
              targetType: 'poi',
              targetId: target.landmarkPoiId!,
              detail: target.secret ?? '',
            }
          : {
              kind: 'hidden_item',
              targetType: 'item',
              targetId: target.itemId!,
              containerType: target.containerType,
              containerId: target.containerId,
              detail: `${itemLabel(target)} is held by ${holderName(target)}.`,
            },
      createdAt: now,
      updatedAt: now,
    })

    const text = `They say ${itemLabel(target)} can be found with ${holderName(target)}.`

    if (source.kind === 'notice') {
      notices.push({
        id: newId(),
        poiId: source.poiId ?? null,
        regionId: null,
        worldId: input.worldId,
        title: `Sought: ${itemLabel(target)}`,
        description: text,
        type: 'request',
        reward: 'Negotiable.',
        contactNpcId: null,
        hookId,
        isUsed: false,
        tags: ['treasure-lead'],
        createdAt: now,
        updatedAt: now,
      })
    } else {
      const flavorSource =
        source.kind === 'tavern'
          ? 'tavern talk'
          : source.kind === 'note'
            ? 'a found note'
            : npcName.get(source.npcId!) ?? 'a local'

      rumors.push({
        id: newId(),
        poiId: source.poiId ?? null,
        regionId: null,
        worldId: input.worldId,
        text,
        source: flavorSource,
        isUsed: false,
        isQuestHook: true,
        hookId,
        sourceNpcId: source.npcId ?? null,
        tags: ['treasure-lead'],
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // Faction-seeks-item pass: each non-party faction with a leader seeks an item held elsewhere
  const factions = await deps.factionRepo.getByRealmId(input.worldId)
  const frng = rng.child('faction-seeks')
  for (const f of factions) {
    if (f.isParty || !f.leaderNpcId) continue
    const candidates = targets.filter(
      (t) =>
        t.kind === 'item' &&
        t.containerId !== f.headquartersPoiId &&
        t.containerId !== f.leaderNpcId,
    )
    if (candidates.length === 0) continue
    const t = frng.pick(candidates)
    const hookId = newId()
    hooks.push({
      id: hookId,
      worldId: input.worldId,
      type: 'artifact',
      title: `${f.name} seeks ${itemLabel(t)}`,
      status: 'open',
      contactNpcId: f.leaderNpcId,
      rewardText: 'The favor of the faction.',
      secret: {
        kind: 'hidden_item',
        targetType: 'item',
        targetId: t.itemId!,
        containerType: t.containerType,
        containerId: t.containerId,
        detail: `${f.name} covets ${itemLabel(t)}, last known to be with ${holderName(t)}.`,
      },
      createdAt: now,
      updatedAt: now,
    })
    if (f.headquartersPoiId) {
      notices.push({
        id: newId(),
        poiId: f.headquartersPoiId,
        regionId: f.regionId,
        worldId: input.worldId,
        title: `${f.name} seeks ${itemLabel(t)}`,
        description: `The ${f.name} will reward whoever brings them ${itemLabel(t)}, last seen with ${holderName(t)}.`,
        type: 'bounty',
        reward: 'The favor of the faction.',
        contactNpcId: f.leaderNpcId,
        hookId,
        isUsed: false,
        tags: ['faction-seeks'],
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  await deps.hookRepo.bulkCreate(hooks)
  if (rumors.length) await deps.rumorRepo.bulkCreate(rumors)
  if (notices.length) await deps.noticeRepo.bulkCreate(notices)
}
