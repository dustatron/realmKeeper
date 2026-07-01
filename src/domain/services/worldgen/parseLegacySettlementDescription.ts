import type { SettlementFlavor } from '@domain/entities/POI'

// Realms generated before the structured-flavor redesign stored settlement
// flavor as one prose block with fixed connectives:
//   "<lead> Known for <knownFor>; <character>. Its heart is <district>.
//    [ Home to <guild>.] Notably, <notable>. A local tradition: <tradition>
//    [\n\nGM secret: <secret>]"
// This module parses that block back into structured data so the v46 migration
// can backfill POI.settlementFlavor / gmNotes and leave only the lead as the
// description. Deterministic and pure — safe to run in a Dexie upgrade.

const GM_SECRET_MARKER = '\n\nGM secret:'
const SETTLEMENT_DESC_RE =
  /^Known for (.*?); (.*?)\. Its heart is (.*?)\.(?: Home to (.*?)\.)? Notably, (.*?)\. A local tradition: (.*)$/s

function clean(value: string | null | undefined): string {
  return (value ?? '').trim()
}

// Legacy settlement leads ended with " The townsfolk honor <deity>...". That
// patron line was dropped from the hook, so strip it when backfilling.
const PATRON_MARKER = ' The townsfolk honor '
function stripPatronLine(lead: string): string {
  const idx = lead.indexOf(PATRON_MARKER)
  return idx === -1 ? clean(lead) : clean(lead.slice(0, idx))
}

export interface LegacySettlementParse {
  /** The lead prose (terrain + patron) with the stitched flavor removed. Falls
   * back to the original text when the block isn't a recognised generated
   * description (e.g. hand-edited). */
  description: string
  /** Structured flavor, or null when the description couldn't be parsed. */
  settlementFlavor: SettlementFlavor | null
  /** The GM-only secret, or '' when none was present. */
  gmNotes: string
}

/** Split off a trailing "\n\nGM secret: ..." marker, if present. */
function splitGmSecret(raw: string): { prose: string; secret: string } {
  const idx = raw.indexOf(GM_SECRET_MARKER)
  if (idx === -1) return { prose: raw, secret: '' }
  return {
    prose: raw.slice(0, idx),
    secret: clean(raw.slice(idx + GM_SECRET_MARKER.length)),
  }
}

export function parseLegacySettlementDescription(raw: string): LegacySettlementParse {
  const { prose, secret } = splitGmSecret(raw ?? '')
  const anchor = prose.indexOf('Known for ')
  if (anchor === -1) {
    // Not a recognised generated block — keep the prose as-is, only lift the secret.
    return { description: clean(prose), settlementFlavor: null, gmNotes: secret }
  }
  const lead = clean(prose.slice(0, anchor))
  const match = SETTLEMENT_DESC_RE.exec(prose.slice(anchor).trim())
  if (!match) {
    return { description: clean(prose), settlementFlavor: null, gmNotes: secret }
  }
  // Groups 3 (district) and 4 (guild) are still matched to consume the text but
  // are no longer surfaced — they were dropped from the settlement data set.
  const [, knownFor, character, , , notable, tradition] = match
  return {
    description: stripPatronLine(lead),
    settlementFlavor: {
      knownFor: clean(knownFor),
      character: clean(character),
      notable: clean(notable),
      tradition: clean(tradition),
    },
    gmNotes: secret,
  }
}
