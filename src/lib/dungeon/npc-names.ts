import type { SeededRandom } from './SeededRandom'

const FIRST_NAMES = [
  'Aldric', 'Bram', 'Cass', 'Darro', 'Edda', 'Fren', 'Grim', 'Holt',
  'Issa', 'Jove', 'Kael', 'Lorn', 'Mira', 'Nox', 'Orin', 'Petra',
  'Quinn', 'Rask', 'Sable', 'Thea', 'Ulric', 'Venn', 'Wren', 'Xara',
  'Yara', 'Zev', 'Hank', 'Steve', 'Bess', 'Gort', 'Ida', 'Mal',
  'Pip', 'Ren', 'Tam', 'Una', 'Vex', 'Wulf', 'Zara', 'Bolt',
  'Crag', 'Dusk', 'Flint', 'Grub', 'Haze', 'Ink', 'Jade', 'Kite',
]

const EPITHETS = [
  'Nine-Fingers', 'One-Eye', 'the Lame', 'Twice-Burned', 'No-Nose',
  'Half-Ear', 'the Scarred', 'Blackthorn', 'Stonefist', 'Ironjaw',
  'the Pale', 'the Bent', 'the Loud', 'the Silent', 'the Mad',
  'the Unlucky', 'the Lucky', 'the Old', 'the Young', 'the Lost',
  'Copperhead', 'Grimtooth', 'Dustcloak', 'Coldblood', 'Ashbeard',
  'the Unwashed', 'the Forgotten', 'Bonecleaver', 'Mudshanks', 'Twitch',
  'Splinters', 'Sixcoins', 'the Coward', 'the Bold', 'the Broken',
  'Nightcrawler', 'Ratskin', 'Ember', 'Rot', 'Slag',
]

/** Generate a seeded fantasy NPC name like "Fren Nine-Fingers" or just "Steve" */
export function generateNPCName(rng: SeededRandom): string {
  const first = rng.pick(FIRST_NAMES)
  if (rng.chance(0.6)) {
    return `${first} ${rng.pick(EPITHETS)}`
  }
  return first
}
