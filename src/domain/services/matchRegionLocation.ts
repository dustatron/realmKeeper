/** Best-effort match of an encounter entry to a region POI by name (longest wins). */
export function matchRegionLocation(
  entryText: string,
  pois: { id: string; name: string }[],
): { poiId: string; name: string } | null {
  const text = entryText.toLowerCase()
  const matches = pois.filter((p) => p.name && text.includes(p.name.toLowerCase()))
  if (matches.length === 0) return null
  matches.sort((a, b) => b.name.length - a.name.length)
  return { poiId: matches[0].id, name: matches[0].name }
}
