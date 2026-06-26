import { describe, it, expect } from 'vitest'
import { createContainer } from './container'

describe('createContainer', () => {
  it('exposes connectionRepo and hookRepo', () => {
    const c = createContainer()
    expect(c.connectionRepo).toBeDefined()
    expect(c.hookRepo).toBeDefined()
    expect(typeof c.connectionRepo.getByEntity).toBe('function')
    expect(typeof c.hookRepo.getById).toBe('function')
  })
})
