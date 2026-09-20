import { describe, expect, it } from 'vitest'

describe('HONJIN test baseline', () => {
  it('runs with a browser-like test environment', () => {
    expect(window.document).toBeDefined()
  })
})
