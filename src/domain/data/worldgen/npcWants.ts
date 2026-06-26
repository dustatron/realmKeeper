import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

// What an NPC wants — either a favor they'd ask the party to do, or a personal
// pursuit they're chasing. Every generated NPC draws one (unless they carry a
// faction agenda), so each reads as a potential quest-giver. Re-authored.

// Favors an NPC might ask of the party.
export const NPC_FAVORS = [
  'recover a stolen family heirloom',
  'find a relative who never came home',
  'deliver a sealed letter to a distant contact',
  'clear vermin from their cellar',
  'settle an old debt with a dangerous lender',
  'retrieve a keepsake left behind in a ruin',
  'escort them safely to another settlement',
  'learn who has been spreading lies about them',
  'recover a lost working animal',
  'broker peace with a feuding neighbor',
  'prove their innocence of a crime',
  'gather a rare herb for an ailing kin',
  'reclaim a plot of land taken from them',
  'track down a runaway apprentice',
  'guard a shipment on a perilous road',
  'find out what happened to a vanished caravan',
  'drive off raiders troubling their farmstead',
  'fetch a debt owed by someone who fled town',
  'investigate strange lights seen at night',
  'rescue a friend held by a rival faction',
  'recover a body for a proper burial',
  'smuggle a person past a checkpoint',
  'identify a mysterious object they found',
  'clear their name with the local authority',
]

// Things an NPC is quietly trying to do for themselves.
export const NPC_PURSUITS = [
  'rise to power within their guild',
  'win the favor of a powerful patron',
  'uncover a long-buried family secret',
  'pay off a blood debt before it comes due',
  'avenge a wrong done to them years ago',
  'earn enough coin to leave this place for good',
  'prove themselves to those who doubt them',
  'find a love they lost long ago',
  'hide a secret that could ruin them',
  'seize a rival’s business or holdings',
  'restore their family’s ruined name',
  'master a craft or forbidden art',
  'escape a debt they can never repay',
  'protect someone they cannot be seen protecting',
  'discover the truth about their own past',
  'climb above the station they were born to',
]

const ALL_WANTS = [...NPC_FAVORS, ...NPC_PURSUITS]

export function pickNpcWant(rng: SeededRandom): string {
  return rng.pick(ALL_WANTS)
}
