import { describe, expect, it } from 'vitest'
import { upNextRows } from './layout'

describe('upNextRows', () => {
  it('fits three rows on a typical phone and more on taller ones', () => {
    expect(upNextRows(664, false)).toBe(3)
    expect(upNextRows(844, false)).toBe(5)
  })
  it('gives a row to the sample banner', () => {
    expect(upNextRows(664, true)).toBe(2)
  })
  it('keeps between two and five rows', () => {
    expect(upNextRows(400, false)).toBe(2)
    expect(upNextRows(2000, false)).toBe(5)
  })
})
