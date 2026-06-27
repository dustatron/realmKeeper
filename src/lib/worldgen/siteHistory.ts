import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export const BUILDER_CULTURES = [
  'dwarven stonewrights',
  'elven exiles',
  'a forgotten human kingdom',
  'a doomsday cult',
  'fae court',
  'an order of knights',
  'sorcerer-kings',
  'a death cult',
  'ancient empire',
  'wandering tribes',
] as const

export const ERAS = [
  'a generation ago',
  'centuries ago',
  'an age ago',
  'before living memory',
  'decades ago',
  'in ancient times',
] as const

export const FATES = [
  'war swept it away',
  'plague emptied its halls',
  'a curse took root',
  'its people simply abandoned it',
  'the wild swallowed it',
  'betrayal from within',
  'the earth swallowed it whole',
  'a catastrophic ritual gone wrong',
] as const

export const OCCUPANT_ACTIVITIES = [
  'standing guard',
  'feeding',
  'asleep',
  'squabbling over scraps',
  'performing a rite',
  'hoarding shinies',
  'patrolling the ruin',
  'lurking in the shadows',
  'tending to the wounded',
] as const

export function pickSiteHistory(
  rng: SeededRandom,
  used?: Set<string>,
): { builderCulture: string; era: string; fate: string } {
  const pickAvoiding = (arr: readonly string[], prefix: string): string => {
    let choice = rng.pick(arr)
    for (let i = 0; i < 5 && used?.has(`${prefix}:${choice}`); i++) choice = rng.pick(arr)
    used?.add(`${prefix}:${choice}`)
    return choice
  }
  return {
    builderCulture: pickAvoiding(BUILDER_CULTURES, 'builder'),
    era: rng.pick(ERAS),
    fate: pickAvoiding(FATES, 'fate'),
  }
}
