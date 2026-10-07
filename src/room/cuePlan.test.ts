import { describe, expect, it } from 'vitest'
import { CUE_BOX, CUE_FULL, CUE_SIZE, cueBox, objectOverdue, planCues, rankCues, type CueInput, type CueLevel } from './cuePlan'
import { OBJECT_ART } from './objects'
import { OBJECT_SCALE, ROOM_TILE_W, TILE_SCALE } from './shell/geometry'

const cue = (id: string, level: CueLevel, x: number, overdue: number = level, kind: CueInput['kind'] = 'stink', y = 150): CueInput => ({ id, kind, level, overdue, anchor: { x, y } })

describe('ranking', () => {
  it('puts the highest level first, then the most days late, then keeps the given order', () => {
    const ranked = rankCues([cue('a', 1, 0), cue('b', 3, 0, 4), cue('c', 3, 0, 9), cue('d', 2, 0), cue('e', 1, 0)])
    expect(ranked.map((c) => c.id)).toEqual(['c', 'b', 'd', 'a', 'e'])
  })
})

describe('budget', () => {
  // Spread far apart so nothing overlaps.
  const many = Array.from({ length: 12 }, (_, i) => cue(`o${i}`, 3, i * 100, i))

  it(`shows only the ${CUE_FULL} most neglected cues in full and animated`, () => {
    const plan = planCues(many)
    expect(plan).toHaveLength(12)
    const full = plan.filter((p) => p.level === 3)
    expect(full.map((p) => p.id)).toEqual(['o11', 'o10'])
    expect(plan.filter((p) => p.animate).map((p) => p.id)).toEqual(['o11', 'o10'])
    expect(plan.filter((p) => p.id !== 'o11' && p.id !== 'o10').every((p) => p.level === 1 && !p.animate)).toBe(true)
  })

  it('keeps a lone level 1 cue at level 1, animated', () => {
    expect(planCues([cue('a', 1, 0)])).toMatchObject([{ id: 'a', level: 1, animate: true }])
  })
})

describe('overlap', () => {
  const overlaps = (plan: ReturnType<typeof planCues>) =>
    plan.some((a, i) => plan.some((b, j) => i < j && a.box.x0 < b.box.x1 && b.box.x0 < a.box.x1 && a.box.y0 < b.box.y1 && b.box.y0 < a.box.y1))

  it('never draws two cues over each other', () => {
    // Twelve late things packed side by side, one tile apart.
    const packed = Array.from({ length: 12 }, (_, i) => cue(`o${i}`, ((i % 3) + 1) as CueLevel, 40 + (i % 6) * ROOM_TILE_W, i, 'dust', 120 + Math.floor(i / 6) * 20))
    const plan = planCues(packed)
    expect(overlaps(plan)).toBe(false)
    expect(plan.length).toBeGreaterThan(0)
  })

  it('nudges a cue sideways, or drops it to level 1, rather than covering a higher-ranked one', () => {
    const plan = planCues([cue('top', 3, 100, 9), cue('next', 3, 100, 5)])
    expect(overlaps(plan)).toBe(false)
    expect(plan[0]).toMatchObject({ id: 'top', level: 3, x: 100 })
    const next = plan.find((p) => p.id === 'next')
    if (next) expect(next.x !== 100 || next.level === 1).toBe(true)
  })
})

describe('size', () => {
  it('keeps every cue within about 1.3 times a one-tile object', () => {
    const objectWidth = 72 * OBJECT_SCALE // a one-tile object's art, 72 units wide
    for (const kind of Object.keys(CUE_BOX) as (keyof typeof CUE_BOX)[]) {
      for (const level of [1, 2, 3] as const) {
        const b = cueBox(kind, level, 0, 0)
        expect(b.x1 - b.x0, `${kind} ${level}`).toBeLessThanOrEqual(objectWidth * 1.3)
      }
    }
  })

  it('shrinks the big levels', () => {
    expect(CUE_SIZE[3]).toBeCloseTo(0.65)
    expect(CUE_SIZE[2]).toBeCloseTo(0.7)
    const b = cueBox('stink', 3, 0, 0)
    expect(b.x1 - b.x0).toBeCloseTo((CUE_BOX.stink[3].x1 - CUE_BOX.stink[3].x0) * TILE_SCALE * 0.65)
  })
})

describe('objectOverdue', () => {
  it("takes each object's most-late chore and leaves out the rest", () => {
    const chores = [
      { id: 'a', objectId: 'sink' },
      { id: 'b', objectId: 'sink' },
      { id: 'c', objectId: 'bed' },
      { id: 'd', objectId: null },
    ]
    const statuses = [
      { choreId: 'a', overdueDays: 2 },
      { choreId: 'b', overdueDays: 5 },
      { choreId: 'c', overdueDays: 0 },
      { choreId: 'd', overdueDays: 9 },
    ]
    expect(objectOverdue(chores, statuses)).toEqual({ sink: 5 })
  })
})

describe('cue anchors', () => {
  it.each(Object.values(OBJECT_ART).map((a) => [a.catalogId, a] as const))('%s sets cueY inside its bounds', (_, art) => {
    expect(art.cueY).toBeDefined()
    expect(art.cueY!).toBeGreaterThanOrEqual(art.bounds.y)
    expect(art.cueY!).toBeLessThan(art.bounds.y + art.bounds.height)
  })
})
