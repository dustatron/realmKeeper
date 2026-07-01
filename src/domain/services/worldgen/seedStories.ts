import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Hook, HookType } from '@domain/entities/Hook'
import type { Notice } from '@domain/entities/Notice'
import type { Rumor } from '@domain/entities/Rumor'
import type { ResolvedTables } from './TableProvider'
import { newId } from '@shared/ulid'

export type WealthBand = 'destitute' | 'poor' | 'modest' | 'prosperous' | 'rich'

// An abstract settlement view — StorySeeder operates on these snapshots, NOT on
// live entities, so it stays a pure pass with no Dexie dependency.
export interface StorySettlement {
  id: string
  name: string
  regionId: string
  wealthBand: WealthBand | null
  produces: string | null
  needs: string[]
  trouble: string
}

export interface StoryRegion {
  id: string
  definingResource: string | null
}

export interface SeedStoriesInput {
  settlements: StorySettlement[]
  regions: StoryRegion[]
  worldId: string
  rng: SeededRandom
  tables?: ResolvedTables
}

export interface StoryBundle {
  hooks: Hook[]
  notices: Notice[]
  rumors: Rumor[]
}

// --- Tone classification by wealth band -----------------------------------
// Rich and prosperous towns generate ACQUISITIVE plots (someone wants what they
// have, or they want to keep it); poor and destitute towns generate DESPERATION
// plots (someone needs to get out, get fed, or get even). Modest towns and null
// bands fall to a neutral pool so generation never stalls.

type Tone = 'acquisitive' | 'desperation' | 'neutral'

function toneFor(band: WealthBand | null): Tone {
  switch (band) {
    case 'rich':
    case 'prosperous':
      return 'acquisitive'
    case 'poor':
    case 'destitute':
      return 'desperation'
    default:
      return 'neutral'
  }
}

// Acquisitive: aimed at a wealthy town's coin and comforts. {town}/{good}
// placeholders are filled per-settlement.
const ACQUISITIVE_HOOKS: { type: HookType; title: string; detail: string }[] = [
  { type: 'theft', title: 'Empty the vaults of {town}', detail: '“{town} is fat on {good} and thinks itself untouchable. There is a strongroom under the counting-house. Open it, take what you can carry, and we split it down the middle.”' },
  { type: 'artifact', title: 'Guard the treasure of {town}', detail: '“Someone means to rob {town} blind before the season turns. I need hands I can trust to sit on that vault and put the fear back into anyone who comes for it.”' },
  { type: 'lost_item', title: 'Secure a luxury bound for {town}', detail: '“A shipment worth a small lordship is moving toward {town}, and everyone on the road knows it. See it safely through, and the merchants of {town} will remember your name.”' },
  { type: 'theft', title: 'Lift the prize of {town}', detail: '“{town} keeps one treasure it loves above coin. Take it — quietly — and a buyer three regions off will make us all rich.”' },
]

// Desperation: aimed at a poor town's survival. {town} placeholder filled per
// settlement.
const DESPERATION_HOOKS: { type: HookType; title: string; detail: string }[] = [
  { type: 'theft', title: 'Steal bread for {town}', detail: '“{town} is starving while the warehouses sit full and guarded. We are not asking for charity anymore. Help us take what we need to last the winter.”' },
  { type: 'delivery', title: 'Run the blockade into {town}', detail: '“Nothing legal gets into {town} at a price we can pay. Move our goods past the watch and we will give you the only thing we have left — our loyalty, and a cut.”' },
  { type: 'escort', title: 'Get us out of {town}', detail: '“There is no future left here. A wagon of us means to slip away before the debt-men come. Get us clear of {town} alive and you can have everything we cannot carry.”' },
  { type: 'delivery', title: 'Find honest work for {town}', detail: '“Half of {town} would do anything for a day\'s wage. Bring back a job, a patron, a reason to stay — or the town empties by spring.”' },
]

// Neutral fallback for modest / unknown bands.
const NEUTRAL_HOOKS: { type: HookType; title: string; detail: string }[] = [
  { type: 'delivery', title: 'A matter wants seeing to in {town}', detail: '“{town} has a problem it would rather not shout about. Discreet, capable folk are wanted. The pay is fair and the questions are few.”' },
  { type: 'lost_item', title: 'Recover what {town} lost', detail: '“Something of value went missing from {town}, and the trail is going cold. Bring it back and the town will stand in your debt.”' },
]

function hooksForTone(tone: Tone): { type: HookType; title: string; detail: string }[] {
  if (tone === 'acquisitive') return ACQUISITIVE_HOOKS
  if (tone === 'desperation') return DESPERATION_HOOKS
  return NEUTRAL_HOOKS
}

// StorySeeder — turn the economic graph into plot. A pure pass over an abstract
// world snapshot that emits existing Hook/Notice/Rumor shapes:
//  - WEALTH-BAND hooks: each settlement gets a hook whose TONE matches its band
//    (rich → acquisitive, poor → desperation), tagged so callers can tell which.
//  - CONTESTED-RESOURCE plots: guaranteed >=1 per region — two parties vying for
//    the region's defining resource (a hook + a cross-region rumor).
//  - CROSS-MAP rumors: a poor town's rumor points at a rich town's vault, even
//    several regions away. Deterministic; null bands handled gracefully.
export function seedStories(input: SeedStoriesInput): StoryBundle {
  const { settlements, regions, worldId, rng } = input
  const now = Date.now()

  const hooks: Hook[] = []
  const notices: Notice[] = []
  const rumors: Rumor[] = []

  const fill = (s: string, town: string, good: string): string =>
    s.replaceAll('{town}', town).replaceAll('{good}', good)

  // --- 1. Wealth-band hooks: one per settlement, tone-matched to its band. ---
  for (const sett of settlements) {
    const tone = toneFor(sett.wealthBand)
    const pool = hooksForTone(tone)
    const template = rng.pick(pool)
    const town = sett.name
    const good = sett.produces ?? 'trade'
    const hookId = newId()

    hooks.push({
      id: hookId,
      worldId,
      type: template.type,
      title: fill(template.title, town, good),
      status: 'open',
      contactNpcId: null,
      rewardText: tone === 'acquisitive'
        ? 'A share of a fortune — and a powerful patron pleased.'
        : tone === 'desperation'
          ? 'All we have left to give, and a debt that outlives us.'
          : 'Fair coin, paid on delivery.',
      secret: {
        kind: tone === 'acquisitive' ? 'hidden_item' : 'destination',
        targetType: 'poi',
        targetId: sett.id,
        detail: fill(template.detail, town, good),
      },
      createdAt: now,
      updatedAt: now,
    })

    notices.push({
      id: newId(),
      poiId: sett.id,
      regionId: sett.regionId,
      worldId,
      title: tone === 'acquisitive' ? 'A discreet opportunity' : tone === 'desperation' ? 'A plea, posted in haste' : 'Posted on the board',
      description: fill(template.detail, town, good),
      type: tone === 'acquisitive' ? 'bounty' : 'job',
      reward: 'Speak to the poster.',
      contactNpcId: null,
      hookId,
      // Tag carries the tone so tests/callers can classify without parsing text.
      tags: ['wealth', tone],
      isUsed: false,
      createdAt: now,
      updatedAt: now,
    })
  }

  // --- 2. Cross-map vault rumors: poor towns covet rich towns far away. ---
  const richTowns = settlements.filter((s) => s.wealthBand === 'rich' || s.wealthBand === 'prosperous')
  const poorTowns = settlements.filter((s) => s.wealthBand === 'poor' || s.wealthBand === 'destitute')
  for (const poor of poorTowns) {
    // Prefer a rich town in ANOTHER region — the cross-map pull. Fall back to any
    // rich town if every rich town shares this region.
    const elsewhere = richTowns.filter((r) => r.regionId !== poor.regionId)
    const targets = elsewhere.length > 0 ? elsewhere : richTowns
    if (targets.length === 0) continue
    const target = rng.pick(targets)
    rumors.push({
      id: newId(),
      poiId: poor.id,
      regionId: poor.regionId,
      worldId,
      text: `They say the strongrooms of a far town swell with ${target.produces ?? 'gold'} while we go hungry — and that a clever crew could be there and back before the snow.`,
      source: 'tavern muttering',
      isUsed: false,
      isQuestHook: true,
      hookId: null,
      tags: ['wealth', 'cross-map'],
      createdAt: now,
      updatedAt: now,
    })
  }

  // --- 3. Contested-resource plots: guarantee >=1 per region. Two parties vie
  // for the region's defining resource — a hook plus a rumor that carries the
  // contest to a neighboring region. ---
  const settlementsByRegion = new Map<string, StorySettlement[]>()
  for (const s of settlements) {
    const list = settlementsByRegion.get(s.regionId) ?? []
    list.push(s)
    settlementsByRegion.set(s.regionId, list)
  }

  regions.forEach((region, i) => {
    const cr = rng.child(`contested-${i}`)
    const resource = region.definingResource ?? 'the only ground worth holding'
    const anchor = settlementsByRegion.get(region.id)?.[0] ?? null
    const hookId = newId()

    hooks.push({
      id: hookId,
      worldId,
      type: 'artifact',
      title: `The struggle for the ${resource}`,
      status: 'open',
      contactNpcId: null,
      rewardText: 'The winning side pays well — and the losing side pays in blood.',
      secret: {
        kind: 'truth',
        targetType: anchor ? 'poi' : 'faction',
        targetId: anchor?.id ?? region.id,
        detail: `Two powers want the ${resource} for themselves, and neither will share it. Whoever takes a side decides who rules this region — and makes a lasting enemy of the other.`,
      },
      createdAt: now,
      updatedAt: now,
    })

    // A notice must anchor to a real POI, so only post one when the region has a
    // settlement to host it (the hook still stands via its faction/region target).
    if (anchor) {
      notices.push({
        id: newId(),
        poiId: anchor.id,
        regionId: region.id,
        worldId,
        title: 'Two masters, one prize',
        description: `Word is that two rival powers are quietly arming for control of the ${resource}. They are hiring.`,
        type: 'bounty',
        reward: 'A faction\'s favor — and its enemies.',
        contactNpcId: null,
        hookId,
        tags: ['contested', 'resource'],
        isUsed: false,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Cross-region rumor: the contest spills into a neighbor's gossip.
    const otherRegions = regions.filter((r) => r.id !== region.id)
    const echoRegion = otherRegions.length > 0 ? cr.pick(otherRegions) : region
    const echoTown = settlementsByRegion.get(echoRegion.id)?.[0] ?? anchor
    rumors.push({
      id: newId(),
      poiId: echoTown?.id ?? null,
      regionId: echoRegion.id,
      worldId,
      text: `Travelers from a neighboring region speak of two powers ready to come to blows over the ${resource}. War over it, they say, would not stop at one region's border.`,
      source: 'road-weary travelers',
      isUsed: false,
      isQuestHook: true,
      hookId,
      tags: ['contested', 'resource', 'cross-map'],
      createdAt: now,
      updatedAt: now,
    })
  })

  return { hooks, notices, rumors }
}
