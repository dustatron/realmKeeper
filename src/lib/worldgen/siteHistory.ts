import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export const BUILDER_CULTURES = [
  'dwarven stonewrights',
  'elven exiles',
  'a forgotten human kingdom',
  'a doomsday cult',
  'a fae court',
  'an order of knights',
  'sorcerer-kings',
  'a death cult',
  'an ancient empire',
  'wandering tribes',
  'a guild of artificers',
  'a monastic order',
  'a line of mad alchemists',
  'a drowned merchant league',
  'beast-tamers of the old steppe',
  'a hermit-prophet and her followers',
  'goblin engineers',
  'a dragon and its hoard-keepers',
  'star-worshipping astronomers',
  'a conquering warlord',
  'serpent-folk of the deep places',
  'a coven of hedge-witches',
  'exiled nobility in hiding',
  'gravediggers who served the old kings',
  'a brotherhood of smugglers',
  'builders whose name was struck from every record',
] as const

export const ERAS = [
  'a generation ago',
  'centuries ago',
  'an age ago',
  'before living memory',
  'decades ago',
  'in ancient times',
  'three kings past',
  'when the old forest was young',
  'before the last great war',
  'in the years of the long winter',
  'so long ago the seasons have shifted since',
  'beyond the reach of the eldest tales',
  'in the founding days of the realm',
  'when the gods still walked openly',
  'a hundred floods ago',
  'in an age no calendar still counts',
] as const

export const FATES = [
  'war swept it away',
  'plague emptied its halls',
  'a curse took root',
  'its people simply abandoned it',
  'the wild swallowed it',
  'betrayal from within',
  'the earth swallowed it whole',
  'a catastrophic ritual went wrong',
  'a long siege starved it out',
  'the wells ran dry and the people followed the water',
  'a flood drowned the lower levels',
  'fire gutted it in a single night',
  'something was dug up that should have stayed buried',
  'the founding line died out with no heir',
  'a rival power razed it for spite',
  'a winter came that never fully left',
  'the faith that built it was outlawed',
  'a pact came due and the price was everyone',
  'the mine played out and the town with it',
  'a madness spread through its halls',
  'the road moved, and trade moved with it',
  'its sleeping protector never woke',
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
  'digging for something buried',
  'fighting among themselves',
  'dragging off fresh prey',
  'building a crude nest',
  'mourning a fallen leader',
  'keeping a wary watch on the entrance',
  'gnawing old bones',
  'arguing over territory',
  'worshipping at a defiled altar',
  'licking its wounds',
  'pacing, restless and hungry',
  'guarding a clutch of eggs',
  'stalking an intruder it has already noticed',
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
