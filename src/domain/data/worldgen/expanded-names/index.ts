import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { HUMAN_MALE_NAMES } from './humanMale'
import { HUMAN_FEMALE_NAMES } from './humanFemale'
import { SURNAMES } from './surnames'
import { RACE_NAMES } from './raceNames'

// The app-owned "expanded names" pool — a large, system-agnostic set of first
// names (ordinary modern humans + flavored fantasy races) and surnames, used when
// a realm is generated with the Expanded Names option. Big enough that a single
// world rarely repeats an NPC name; combined with per-world de-duplication it
// effectively never does.

export { HUMAN_MALE_NAMES, HUMAN_FEMALE_NAMES, SURNAMES, RACE_NAMES }

/** First-name pool for a race+gender: the race's own list when we have one, else
 * the ordinary human pool (humans + any custom realm races). */
export function firstNamePool(race: string, gender: 'male' | 'female'): string[] {
  const raced = RACE_NAMES[race]
  if (raced && raced[gender]?.length) return raced[gender]
  return gender === 'male' ? HUMAN_MALE_NAMES : HUMAN_FEMALE_NAMES
}

/** Humans (and custom races) carry a family surname; flavored fantasy races that
 * have their own first-name list go by a single given name. */
function usesSurname(race: string): boolean {
  return !RACE_NAMES[race]
}

/** Pick a full NPC name from the expanded pool, avoiding names already used in
 * this world (`used`). Falls back to accepting a repeat only if it can't find a
 * fresh combination after several tries (astronomically unlikely at this pool
 * size). Deterministic given `rng`. */
export function pickExpandedName(
  race: string,
  gender: 'male' | 'female',
  rng: SeededRandom,
  used: Set<string>,
): string {
  const firstPool = firstNamePool(race, gender)
  const withSurname = usesSurname(race) && SURNAMES.length > 0
  const draw = (): string => {
    const first = rng.pick(firstPool)
    return withSurname ? `${first} ${rng.pick(SURNAMES)}` : first
  }
  for (let i = 0; i < 8; i++) {
    const full = draw()
    if (!used.has(full)) {
      used.add(full)
      return full
    }
  }
  const full = draw()
  used.add(full)
  return full
}
