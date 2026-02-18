import { useActiveRealm } from './useActiveRealm'

export function useRaceColor(race?: string): string | null {
  const realm = useActiveRealm()
  if (!race) return null
  return (realm?.raceColors ?? {})[race.toLowerCase()] ?? null
}
