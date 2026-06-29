import type { TableDef, TableSet } from '@domain/entities/TableDef'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export const settlementProblemTexts = [
  'Werewolves are taking livestock first, and everyone knows people are next.',
  'Something with horns and ash-black hands attacks anyone outside after moonrise.',
  'A wasting sickness is spreading, but the first victims keep walking at night.',
  'Bandits have the roads locked down and know every caravan schedule.',
  'Food stores are running short after repeated thefts from granaries and cellars.',
  'A masked cult is recruiting the desperate with promises of protection.',
  'Something huge is burrowing under foundations and collapsing cellars one by one.',
  'Trolls have claimed the nearest bridge and demand a new tribute each week.',
  'The main well is running dry, and the second well whispers names from below.',
  'People are forgetting spouses, children, debts, and even their own names.',
  'A pale fog settles every dawn and no wind can move it.',
  'Everyone shares the same nightmare, and each morning one detail becomes real.',
  'Children are drawing the same black tower though none have left town.',
  'The dead are being buried empty-eyed, as if something left before death.',
  'A beloved leader has not slept in weeks and now speaks in someone else\'s voice.',
  'Every mirror in town shows a different room under the settlement.',
  'A tax collector arrived with soldiers, but nobody remembers sending for them.',
  'The local shrine grants miracles, then takes memories as payment.',
  'A mine, cellar, or old drain keeps releasing warm air and distant singing.',
  'A noble household is hiding a captive creature that keeps calling for help.',
  'A caravan brought a sealed chest, and now locks open by themselves at night.',
  'Crops grow overnight into pale stalks that bleed when cut.',
  'A missing hunter returned with perfect manners and no shadow.',
  'Someone is replacing town records with versions where residents never existed.',
  'The watch keeps finding doors painted red from the inside.',
  'Birds, dogs, and horses refuse to enter the central square.',
  'A new prophet predicts deaths accurately, then asks for payment to stop them.',
  'The river changed course overnight and exposed old bones under the mill.',
  'A local feud is being pushed toward murder by anonymous letters.',
  'Travelers arrive safely, then vanish from locked rooms before morning.',
  'Trolls have moved in upriver and are fouling the town\'s water supply.',
  'Marauding goblinoids raid the outlying farms and steal what they can carry.',
  'A rival\'s blockade is choking off a shipment of vital supplies.',
  'A plague spreads, and the only antidote lies a hard journey away.',
  'Two prominent townsfolk feud, and daily business grinds to a halt.',
  'A long-forgotten curse on the land is stirring awake.',
  'A sealed cursed relic nearby leaks its malice into the streets.',
  'The town sits between two warring giant clans and bears the fallout.',
  'A faction claims the town\'s land as a holy site and demands it back.',
  'Extreme, sometimes magical, weather batters the region.',
  'A rival\'s lies have soured every guild against the town.',
  'A jealous rival has put a bounty on a beloved local\'s head.',
  'The soil has gone bad; nothing grows but potatoes and weeds.',
  'A once-a-generation migration of magical beasts is passing through.',
  'Hill giants want to "trade" but don\'t grasp the concept of money.',
  'A sea serpent has grown infatuated with the new lighthouse.',
  'Houses are collapsing into the earth — a giant badger has burrowed beneath.',
  'Bored pixies and faerie dragons escalate their pranks on the townsfolk.',
  'Wood-boring insects infest the buildings; the only repellent comes from far off.',
  'Every night the livestock wander north, called by something unseen.',
  'A large predator stalks the roads, leaving only scraps of its kills.',
  'The miller is accused of cheating the village at the grindstone.',
  'A plague was unearthed in the mine.',
  'The whole village cannot sleep, and no one knows why.',
  'The roads rearrange themselves overnight; outsiders call the land cursed.',
  'A goldrush has drawn outlaws and vagrants — and the ore may be fake.',
  'The sun no longer touches this stretch of land.',
  'Dragons in merchant\'s guise offer to buy the whole town outright.',
  'A bandit gang has decided this town is their destiny.',
  'A demonic skeleton was unearthed, and the village youth act strangely.',
  'A spurned druid sabotages the farms built on sacred ground.',
  'Mercenaries "protect" the town and won\'t leave until it sells out to a lord.',
  'The lord died without an heir, and the town fights over who leads.',
  'An eclipse has begun — and refuses to end.',
  'A mysterious circus has rolled into town, and folk who enter don\'t come out the same.',
  'The cats, improbably, appear to be organizing into a crime syndicate.',
]

function entries(items: string[]) {
  return items.map((text, i) => ({ min: i + 1, max: i + 1, text }))
}

export const settlementProblemTableSets: TableSet[] = [
  {
    id: 'tableset-worldgen-settlement-problems',
    name: 'Settlement Problems',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: ['table-worldgen-settlement-problem'],
  },
]

export const settlementProblemTableDefs: TableDef[] = [
  {
    id: 'table-worldgen-settlement-problem',
    setId: 'tableset-worldgen-settlement-problems',
    name: 'Settlement Problem',
    diceFormula: `1d${settlementProblemTexts.length}`,
    entries: entries(settlementProblemTexts),
    tags: ['worldgen', 'settlement', 'problem'],
    systemId: null,
  },
]

export function pickSettlementProblem(rng: SeededRandom, current?: string | null): string {
  const currentText = current?.trim()
  const candidates = currentText
    ? settlementProblemTexts.filter((problem) => problem !== currentText)
    : settlementProblemTexts
  return rng.pick(candidates.length > 0 ? candidates : settlementProblemTexts)
}
