import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Biome } from '@domain/data/worldgen/biomes'
import type { NPC } from '@domain/entities/NPC'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { RuinSite, RuinArea, OccupantGroup } from '@domain/entities/RuinSite'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { biomeTier } from '@domain/services/worldgen/regionFlavor'
import { resolveCreature, pickMagicItem } from '~/lib/worldgen/compendium-utils'
import { buildCreatureNpc } from '@domain/services/worldgen/npcFactory'
import { generateTreasureItems } from '~/lib/worldgen/treasure-gen'
import { newId } from '@shared/ulid'
import { generateRuinSite } from '~/lib/ruin/RuinGenerator'
import { ruinCreatureLevel } from '~/lib/ruin/ruinCreaturePools'

// NOTE: occupant NPCs are built with the SHARED `buildCreatureNpc` factory.
// Do not hand-roll NPC object literals here.

export interface GenerateRuinInput {
  poiId: string
  worldId: string
  systemId: string
  seed: string
  usedHistory?: Set<string>
}

export interface GenerateRuinDeps {
  poiRepo: IPOIRepository
  npcRepo: INPCRepository
  regionRepo: IRegionRepository
}

export async function executeGenerateRuin(input: GenerateRuinInput, deps: GenerateRuinDeps): Promise<void> {
  const poi = await deps.poiRepo.getById(input.poiId)
  if (!poi) return

  const region = await deps.regionRepo.getById(poi.regionId)
  const biome = (region?.terrain ?? 'grasslands') as Biome
  const tier = biomeTier(biome)

  // Regen: wipe prior occupant NPCs linked to this ruin.
  const prior = await deps.npcRepo.getByPoiId(poi.id)
  for (const n of prior) await deps.npcRepo.delete(n.id)

  const rng = new SeededRandom(input.seed)
  const plan = generateRuinSite(input.seed, tier, [], input.usedHistory ?? new Set(), rng)

  const now = Date.now()
  const levelCap = ruinCreatureLevel(tier, input.systemId)
  const newNpcs: NPC[] = []
  const treasure: TreasureItem[] = []
  let notablePrizeItemId: string | null = null

  const areas: RuinArea[] = plan.areas.map((ap) => {
    // Occupants → NPC entities via the shared creature builder
    const occupants: OccupantGroup[] = ap.occupantSpecs.map((spec) => {
      const npcIds: string[] = []
      for (let i = 0; i < spec.count; i++) {
        const slug = spec.slugs[i % spec.slugs.length]
        const resolved = resolveCreature(slug, input.systemId, rng, { levelCap })
        // Use the SHARED creature builder so ruin occupants get the same
        // appearance/stat-block treatment as dungeon creatures.
        const npc = buildCreatureNpc(
          {
            worldId: input.worldId,
            regionId: poi.regionId,
            poiId: poi.id,
            systemId: input.systemId,
            compendiumId: resolved?.id ?? null,
            name: resolved?.name ?? slug.replace(/_/g, ' '),
            activity: spec.activity,
            depth: levelCap,
            dangerLevel: 'medium',
            disposition: 'hostile',
            tags: ['creature', 'ruin'],
          },
          rng,
        )
        newNpcs.push(npc)
        npcIds.push(npc.id)
      }
      return { npcIds, activity: spec.activity }
    })

    // Loot → TreasureItem[] tagged with areaIndex (SINGLE SOURCE: all loot on poi.treasure)
    for (const loot of ap.lootSpecs) {
      if (loot.magic) {
        const picked = pickMagicItem(input.systemId, rng)
        const item: TreasureItem = {
          id: newId(),
          name: picked?.name ?? 'Strange Relic',
          description: picked?.description ?? 'A magical item of unknown origin.',
          value: 'priceless',
          quantity: 1,
          collected: false,
          isMagic: true,
          ...(picked?.id ? { compendiumId: picked.id } : {}),
          areaIndex: ap.order,
          notable: loot.notable,
        }
        treasure.push(item)
        if (loot.notable) notablePrizeItemId = item.id
      } else {
        const items = generateTreasureItems('standard', 1, rng).map((t) => ({
          ...t,
          areaIndex: ap.order,
          notable: loot.notable,
        }))
        for (const item of items) {
          treasure.push(item)
          if (loot.notable) notablePrizeItemId = item.id
        }
      }
    }

    return {
      name: ap.name,
      order: ap.order,
      isEntry: ap.isEntry,
      readAloud: ap.readAloud,
      detail: ap.detail,
      discovery: ap.discovery,
      occupants,
    }
  })

  if (newNpcs.length > 0) await deps.npcRepo.bulkCreate(newNpcs)

  const ruinSite: RuinSite = {
    origin: plan.origin,
    fall: plan.fall,
    builderCulture: plan.builderCulture,
    era: plan.era,
    currentState: plan.currentState,
    factionId: plan.factionId,
    hook: plan.hook,
    notablePrizeItemId,
    areas,
  }

  await deps.poiRepo.update({
    ...poi,
    ruinSite,
    treasure,
    poiGenOptions: { seed: input.seed },
    updatedAt: now,
  })
}
