import type { Doom, DoomStage } from '@domain/entities/Doom'
import type { Connection } from '@domain/entities/Connection'
import type { POI } from '@domain/entities/POI'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export type DoomEffectKind = 'cut_trade' | 'foul_water' | 'spawn_problem'

export interface DoomEffect {
  kind: DoomEffectKind
  targetId: string      // connectionId (cut_trade) | poiId (foul_water | spawn_problem)
  description: string   // GM-facing summary
}

export interface DoomTickSuggestion {
  doomId: string
  previousProgress: number
  newProgress: number
  firedStages: DoomStage[]   // stages whose threshold is in (previousProgress, newProgress]
  effects: DoomEffect[]
  reckoned: boolean           // newProgress >= doom.segments
}

export interface DoomGraph {
  connections: Connection[]   // pass the realm's connections; filter kind==='supplies' internally
  pois: POI[]                 // the realm's POIs
}

export function rollDoomTick(
  doom: Doom,
  graph: DoomGraph,
  rng: SeededRandom,
): DoomTickSuggestion | null {
  if (doom.status !== 'looming') return null

  const previousProgress = doom.progress
  const newProgress = Math.min(doom.segments, doom.progress + 1)

  const firedStages = doom.stages.filter(
    (s) =>
      s.threshold > previousProgress &&
      s.threshold <= newProgress &&
      !s.fired,
  )

  const reckoned = newProgress >= doom.segments

  const effects: DoomEffect[] = []

  // Pre-compute filtered pools
  const suppliesConns = graph.connections.filter(
    (c) => c.kind === 'supplies' && c.worldId === doom.worldId,
  )
  const waterPois = graph.pois.filter(
    (p) =>
      p.trade !== null &&
      (p.trade!.needs.includes('water') || p.trade!.produces === 'water'),
  )
  const tradePois = graph.pois.filter((p) => p.trade !== null)

  for (const _stage of firedStages) {
    switch (doom.vector) {
      case 'roads': {
        if (suppliesConns.length === 0) break
        const conn = rng.pick(suppliesConns)
        effects.push({
          kind: 'cut_trade',
          targetId: conn.id,
          description: `The supply route is severed by ${doom.name}.`,
        })
        break
      }
      case 'water': {
        if (waterPois.length === 0) break
        const poi = rng.pick(waterPois)
        effects.push({
          kind: 'foul_water',
          targetId: poi.id,
          description: `The water supply at ${poi.name} is fouled by ${doom.name}.`,
        })
        break
      }
      case 'blight':
      case 'resource': {
        if (tradePois.length === 0) break
        const poi = rng.pick(tradePois)
        const theme = doom.keyedResource ?? doom.keyedBiome ?? 'doom'
        effects.push({
          kind: 'spawn_problem',
          targetId: poi.id,
          description: `A ${theme}-blight problem emerges at ${poi.name}.`,
        })
        break
      }
    }
  }

  return {
    doomId: doom.id,
    previousProgress,
    newProgress,
    firedStages,
    effects,
    reckoned,
  }
}
