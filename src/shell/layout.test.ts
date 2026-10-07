import { describe, expect, it } from 'vitest'
import { upNextRows } from './layout'

describe('upNextRows', () => {
  it('keeps one row on short phones so the room stays big', () => {
    expect(upNextRows(568, false)).toBe(1)
    expect(upNextRows(664, false)).toBe(1)
    expect(upNextRows(664, true)).toBe(1)
    expect(upNextRows(699, false)).toBe(1)
  })
  it('fits more rows on taller phones', () => {
    expect(upNextRows(700, false)).toBe(4)
    expect(upNextRows(844, false)).toBe(5)
  })
  it('gives a row to the sample banner on taller phones', () => {
    expect(upNextRows(700, true)).toBe(3)
    expect(upNextRows(844, true)).toBe(4)
  })
  it('keeps between one and five rows', () => {
    expect(upNextRows(400, false)).toBe(1)
    expect(upNextRows(2000, false)).toBe(5)
    expect(upNextRows(700, true)).toBeGreaterThanOrEqual(2)
  })
})

describe('ROOM_ASPECT_VARS', () => {
  it('carries the room viewBox size for the home stage', async () => {
    const { ROOM_ASPECT_VARS } = await import('./layout')
    const { ROOM_VIEWBOX } = await import('../room/shell/geometry')
    expect(ROOM_ASPECT_VARS).toEqual({ '--room-w': ROOM_VIEWBOX.width, '--room-h': ROOM_VIEWBOX.height })
  })
})
