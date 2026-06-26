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
