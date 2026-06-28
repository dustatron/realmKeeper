import { describe, it, expect } from 'vitest'
import type { HookSecret } from './Hook'
import type { Rumor } from './Rumor'

describe('B2 entity extensions', () => {
  it('HookSecret supports item targets with a container', () => {
    const s: HookSecret = { kind: 'hidden_item', targetType: 'item', targetId: 'item1', containerType: 'npc', containerId: 'npc1', detail: 'x' }
    expect(s.containerType).toBe('npc')
  })
  it('Rumor supports sourceNpcId', () => {
    const r = { sourceNpcId: 'npc1' } as Partial<Rumor>
    expect(r.sourceNpcId).toBe('npc1')
  })
})
