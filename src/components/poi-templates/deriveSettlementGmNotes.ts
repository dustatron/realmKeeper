export interface GmNoteContext {
  produces: string | null
  needs: string[]
  wealthBand: string | null
  trouble: string | null
  tags: string[]                // poi.tags — lore traits e.g. "Built on Bones of Giants"
  factions: Array<{
    name: string
    type: string | null
    leaderName: string | null
    currentMove: string | null
    leaderWant: string | null
  }>
  routes: Array<{ name: string }>  // destinations
  topTreasure: string | null
  knownFor: string | null
  notable: string | null
}

export interface GmNote {
  title: string
  body: string
}

const RICH_BANDS = new Set(['rich', 'prosperous'])

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Deterministic, pure. Returns GM notes derived from settlement data. Only THE
 * SQUEEZE (economy leverage) is surfaced — the speculative RIOT/PAYOFF and the
 * formulaic PRIZE note types were dropped as not useful. */
export function deriveSettlementGmNotes(ctx: GmNoteContext): GmNote[] {
  const notes: GmNote[] = []

  // THE SQUEEZE — economy leverage
  if (
    ctx.needs.length > 0 &&
    ctx.wealthBand != null &&
    RICH_BANDS.has(ctx.wealthBand.toLowerCase())
  ) {
    const needsList = ctx.needs.join(', ')
    const routePart =
      ctx.routes.length > 0 ? ` via ${ctx.routes[0].name}` : ''
    notes.push({
      title: 'THE SQUEEZE',
      body: `${cap(ctx.wealthBand)} but needs ${needsList}. Whoever controls ${needsList}${routePart} owns the town.`,
    })
  }

  return notes
}
