import { describe, it, expect } from 'vitest'
import { parseLegacySettlementDescription } from './parseLegacySettlementDescription'

describe('parseLegacySettlementDescription', () => {
  const ex1 =
    'A prison in the forest. The townsfolk honor Pol the Glass-Eyed, who oversees marketplaces and counts every coin twice in his sleep. Known for a famous midsummer festival; its oldest hall slowly tilting. Its heart is the Shrine ward. Notably, it is built atop the ruins of a long-destroyed city, crumbling ramparts ringing it. A local tradition: The Setting of Lamps: every window holds a lit lamp till dawn; the watch counts the dark ones.'
  const ex2 =
    'A stronghold in the forest. The townsfolk honor Mossa the Silent Sister, twin to a god no temple will name; her altars hold only one offering. Known for its blue-glazed rooftops; shadowed by an enormous old tree. Its heart is the Foreign quarter. Notably, mushrooms are everywhere here — farmed, wild, and magically enlarged. A local tradition: The Festival of Patches: the most-mended garment is judged the winner, prize given by the tailor.'

  it('parses a real generated settlement description into structured flavor', () => {
    const r = parseLegacySettlementDescription(ex1)
    expect(r.settlementFlavor).toEqual({
      knownFor: 'a famous midsummer festival',
      character: 'its oldest hall slowly tilting',
      notable: 'it is built atop the ruins of a long-destroyed city, crumbling ramparts ringing it',
      tradition:
        'The Setting of Lamps: every window holds a lit lamp till dawn; the watch counts the dark ones.',
    })
  })

  it('strips the patron/deity line from the lead description', () => {
    const r = parseLegacySettlementDescription(ex1)
    expect(r.description).toBe('A prison in the forest.')
    expect(r.description).not.toContain('townsfolk honor')
  })

  it('handles em-dashes and colons in flavor text', () => {
    const r = parseLegacySettlementDescription(ex2)
    expect(r.description).toBe('A stronghold in the forest.')
    expect(r.settlementFlavor?.notable).toBe(
      'mushrooms are everywhere here — farmed, wild, and magically enlarged',
    )
    expect(r.settlementFlavor?.tradition).toContain('The Festival of Patches')
  })

  it('moves a trailing GM secret into gmNotes and out of the description', () => {
    const raw = ex1 + '\n\nGM secret: the mayor is not who they claim.'
    const r = parseLegacySettlementDescription(raw)
    expect(r.gmNotes).toBe('the mayor is not who they claim.')
    expect(r.description).toBe('A prison in the forest.')
    expect(r.settlementFlavor?.knownFor).toBe('a famous midsummer festival')
  })

  it('returns null flavor for non-settlement / hand-edited prose', () => {
    const r = parseLegacySettlementDescription('A quiet ruin on the moor. Nothing stirs.')
    expect(r.settlementFlavor).toBeNull()
    expect(r.description).toBe('A quiet ruin on the moor. Nothing stirs.')
    expect(r.gmNotes).toBe('')
  })
})
