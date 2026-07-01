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

/** Deterministic, pure. Returns up to 4 GM notes derived from settlement data. */
export function deriveSettlementGmNotes(ctx: GmNoteContext): GmNote[] {
  const notes: GmNote[] = []

  // 1. THE SQUEEZE — economy leverage
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

  // 2. THE RIOT — faction move & leader motive
  const facWithMove = ctx.factions.find((f) => f.currentMove != null)
  if (facWithMove) {
    const move = facWithMove.currentMove!.toLowerCase()
    if (facWithMove.leaderName && facWithMove.leaderWant) {
      notes.push({
        title: 'THE RIOT',
        body: `${facWithMove.leaderName} (${facWithMove.name}) is ${move}; wants to ${facWithMove.leaderWant}. Personal.`,
      })
    } else if (facWithMove.leaderName) {
      notes.push({
        title: 'THE RIOT',
        body: `${facWithMove.name} is ${move}. ${facWithMove.leaderName} leads this; stakes are real.`,
      })
    } else {
      notes.push({
        title: 'THE RIOT',
        body: `${facWithMove.name} is ${move}. Stakes are real.`,
      })
    }
  }

  // 3. THE PAYOFF — problem tied to lore tag
  if (ctx.trouble != null && ctx.tags.length > 0) {
    const tag = ctx.tags[0].toLowerCase()
    notes.push({
      title: 'THE PAYOFF',
      body: `${ctx.trouble} — because ${tag}.`,
    })
  }

  // 4. THE GROUNDING — treasure tied to town identity
  const craft = ctx.knownFor ?? ctx.notable
  if (ctx.topTreasure != null && craft != null) {
    notes.push({
      title: 'THE GROUNDING',
      body: `${ctx.topTreasure} came from ${craft}; taking it will be noticed.`,
    })
  }

  return notes
}
