import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Biome } from '@domain/data/worldgen/biomes'
import type { LandmarkLore } from '@domain/entities/LandmarkLore'
import { pickCairn } from '@domain/services/worldgen/cairnPick'
import {
  LANDMARK_LEGENDS, LANDMARK_TRUTHS, LANDMARK_SECRETS,
  LANDMARK_TRIGGERS, LANDMARK_EFFECTS, LANDMARK_QUEST_HOOKS,
} from '@domain/data/landmark-tables'

export function generateLandmark(_seed: string, _biome: Biome, rng: SeededRandom): LandmarkLore {
  const curiosity = pickCairn(rng, 'table-cairn-curiosity') || 'a strange place'
  const feature = pickCairn(rng, 'table-cairn-curiosity-feature') || ''
  return {
    legend: `Travelers know ${curiosity.toLowerCase()}; ${rng.pick(LANDMARK_LEGENDS)}.`,
    truth: `In truth, ${rng.pick(LANDMARK_TRUTHS)}.`,
    secret: rng.pick(LANDMARK_SECRETS) + '.',
    interactionTrigger: rng.pick(LANDMARK_TRIGGERS) + ',',
    interactionEffect: rng.pick(LANDMARK_EFFECTS) + '.',
    questHook: rng.pick(LANDMARK_QUEST_HOOKS) + '.',
    sensory: feature ? `${feature}.` : `${curiosity}.`,
  }
}
