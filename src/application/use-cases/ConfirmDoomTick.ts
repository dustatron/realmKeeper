import type { Doom } from '@domain/entities/Doom'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import type { IDoomRepository } from '@application/ports/IDoomRepository'
import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import type { DoomTickSuggestion } from '@domain/services/doom/rollDoomTick'
import { newId } from '@shared/ulid'

export interface ConfirmDoomTickDeps {
  doomRepo: IDoomRepository
  connectionRepo: IConnectionRepository
  poiRepo: IPOIRepository
  poiEventRepo: IPOIEventRepository
  worldEventRepo: IWorldEventRepository
  eventBus: IEventBus
}

export async function executeConfirmDoomTick(
  worldId: string,
  doom: Doom,
  suggestion: DoomTickSuggestion,
  dt: WorldDateTime,
  deps: ConfirmDoomTickDeps,
): Promise<void> {
  const now = Date.now()

  // ── Apply each effect ────────────────────────────────────────────────────

  for (const effect of suggestion.effects) {
    switch (effect.kind) {
      case 'cut_trade': {
        await deps.connectionRepo.delete(effect.targetId)
        break
      }

      case 'foul_water': {
        const poi = await deps.poiRepo.getById(effect.targetId)
        if (!poi || !poi.trade) break

        let updatedTrade: { produces: string; needs: string[] }
        if (poi.trade.produces === 'water') {
          // Water source is fouled — clear production
          updatedTrade = { ...poi.trade, produces: '' }
        } else {
          // Ensure 'water' appears in needs (settlement now desperately needs water)
          const needs = poi.trade.needs.includes('water')
            ? poi.trade.needs
            : [...poi.trade.needs, 'water']
          updatedTrade = { ...poi.trade, needs }
        }

        await deps.poiRepo.update({ ...poi, trade: updatedTrade, updatedAt: now })
        break
      }

      case 'spawn_problem': {
        const poiEvent: POIEvent = {
          id: newId(),
          poiId: effect.targetId,
          worldId,
          name: `${doom.name} — Doom Problem`,
          description: effect.description,
          type: 'disaster',
          trigger: {
            year: dt.year,
            season: dt.season,
            day: dt.day,
            watch: dt.watch,
          },
          recurring: false,
          durationWatches: 1,
          isActive: true,
          effects: '',
          tags: ['doom'],
          createdAt: now,
          updatedAt: now,
        }
        await deps.poiEventRepo.create(poiEvent)
        break
      }
    }
  }

  // ── Update the doom entity ────────────────────────────────────────────────

  const firedThresholds = new Set(suggestion.firedStages.map((s) => s.threshold))

  const updatedDoom: Doom = {
    ...doom,
    stages: doom.stages.map((s) =>
      firedThresholds.has(s.threshold) ? { ...s, fired: true } : s,
    ),
    progress: suggestion.newProgress,
    status: suggestion.reckoned ? 'reckoned' : 'looming',
    updatedAt: now,
  }

  await deps.doomRepo.update(updatedDoom)

  // ── Write one WorldEvent per fired stage ─────────────────────────────────
  // effects[i] corresponds to firedStages[i] (may be undefined if no target existed)

  for (let i = 0; i < suggestion.firedStages.length; i++) {
    const stage = suggestion.firedStages[i]
    const stageEffect = suggestion.effects[i]

    const relatedEntityIds: string[] = [doom.id]
    if (stageEffect) relatedEntityIds.push(stageEffect.targetId)

    const worldEvent: WorldEvent = {
      id: newId(),
      worldId,
      year: dt.year,
      season: dt.season,
      day: dt.day,
      watch: dt.watch,
      type: 'doom_stage',
      title: stage.portent.slice(0, 80),
      description: stageEffect
        ? `${stage.portent} — ${stageEffect.description}`
        : stage.portent,
      relatedEntityIds,
      createdAt: now,
    }

    await deps.worldEventRepo.create(worldEvent)
  }

  // eventBus is in deps for forward-compat; no domain event defined yet
  void deps.eventBus
}
