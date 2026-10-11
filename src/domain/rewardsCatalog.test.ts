import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ITEMS } from '../character/items'
import { CATALOG, DECOR } from '../catalog/objects'
import { PALETTE } from '../art/palette'
import { OBJECT_ART } from '../room/objects'
import { FLOOR_STYLES, WALL_STYLES } from '../room/shell/styles'
import stylesSource from '../room/shell/styles.ts?raw'
import { SPECIES } from './types'
import type { Progress } from './types'
import { applyUnlocks, FREE_ITEMS, FREE_STYLES, nextUnlocks, UNLOCKS } from './unlocks'

// Integrity pins for the reward catalog: every unlock refers to something real,
// rewards stay cosmetic, the order and thresholds players already earned don't
// move, and the second tier renders. Rules: docs/SPEC.md "Rewards are purely cosmetic".

const progress = (over: Partial<Progress> = {}): Progress => ({ homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [], ...over })
const ids = (list: { id: string }[]) => list.map((x) => x.id)
const choreUnlocks = () => UNLOCKS.filter((x) => x.rule.type === 'chores')
const streakUnlocks = () => UNLOCKS.filter((x) => x.rule.type === 'streak')

/** The unlock ids a player holds after earning every reward up to `choreCount` chores (and no streak). */
const earnedChores = (choreCount: number) => applyUnlocks(progress({ choreCount }), 0).progress

describe('every unlock refers to something real', () => {
  it('item unlocks point at an ITEMS entry', () => {
    for (const u of UNLOCKS.filter((x) => x.kind === 'item')) {
      expect(ITEMS.some((i) => i.id === u.ref), u.id).toBe(true)
    }
  })

  it('decor unlocks point at a DECOR entry that names this unlock', () => {
    for (const u of UNLOCKS.filter((x) => x.kind === 'decor')) {
      const entry = DECOR.find((e) => e.id === u.ref)
      expect(entry, u.id).toBeDefined()
      expect(entry!.unlock, u.id).toBe(u.id)
    }
  })

  it('decor unlocks have object art whose footprint matches the catalog entry', () => {
    for (const u of UNLOCKS.filter((x) => x.kind === 'decor')) {
      const entry = DECOR.find((e) => e.id === u.ref)!
      const art = OBJECT_ART[u.ref]
      expect(art, u.id).toBeDefined()
      expect(art.catalogId, u.id).toBe(u.ref)
      expect(art.footprint, u.id).toEqual(entry.footprint)
    }
  })

  it('wall and floor unlocks point at a real style', () => {
    for (const u of UNLOCKS.filter((x) => x.kind === 'wall')) {
      expect(WALL_STYLES.some((s) => s.id === u.ref), u.id).toBe(true)
    }
    for (const u of UNLOCKS.filter((x) => x.kind === 'floor')) {
      expect(FLOOR_STYLES.some((s) => s.id === u.ref), u.id).toBe(true)
    }
  })

  it('every unlock id is its kind and ref', () => {
    for (const u of UNLOCKS) expect(u.id, u.name).toBe(`${u.kind}:${u.ref}`)
  })

  it('every DECOR entry is reachable through exactly one decor unlock', () => {
    for (const e of DECOR) {
      const matches = UNLOCKS.filter((u) => u.kind === 'decor' && u.ref === e.id)
      expect(matches.length, e.id).toBe(1)
    }
  })

  it('the free items and styles are real too', () => {
    for (const id of FREE_ITEMS) expect(ITEMS.some((i) => `item:${i.id}` === id), id).toBe(true)
    for (const id of FREE_STYLES) {
      const [kind, ref] = id.split(':')
      const known = kind === 'wall' ? WALL_STYLES.some((s) => s.id === ref) : FLOOR_STYLES.some((s) => s.id === ref)
      expect(known, id).toBe(true)
    }
  })
})

describe('rewards stay cosmetic', () => {
  it('decor never brings chores', () => {
    for (const e of DECOR) expect(e.chores, e.id).toEqual([])
  })

  it('nothing in the starting catalog has an unlock', () => {
    for (const e of CATALOG) expect(e.unlock, e.id).toBeUndefined()
  })

  it('every ITEMS entry outside FREE_ITEMS is reachable through exactly one unlock', () => {
    const itemUnlocks = UNLOCKS.filter((u) => u.kind === 'item')
    for (const item of ITEMS) {
      const id = `item:${item.id}`
      const reachable = itemUnlocks.filter((u) => u.ref === item.id).length
      expect(reachable, id).toBe(FREE_ITEMS.includes(id) ? 0 : 1)
    }
  })

  it('the free outfits are never behind an unlock', () => {
    for (const id of FREE_ITEMS) expect(UNLOCKS.some((u) => u.id === id), id).toBe(false)
  })
})

describe('unlock order and thresholds', () => {
  it('unlock ids are unique', () => {
    expect(new Set(ids(UNLOCKS)).size).toBe(UNLOCKS.length)
  })

  it('chore counts strictly increase in list order', () => {
    const counts = choreUnlocks().map((u) => (u.rule as { count: number }).count)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i], `${UNLOCKS[i].id} after ${counts[i - 1]}`).toBeGreaterThan(counts[i - 1])
    }
  })

  // The autumn set (a 10-day sweater) was added after the 14-day carpet as a seasonal pair, so the
  // first tier isn't in streak order by design; from the second tier on, streak rewards climb.
  it('streak days strictly increase through the second tier, each beyond every first-tier streak', () => {
    const first = UNLOCKS.slice(0, 16).filter((u) => u.rule.type === 'streak').map((u) => (u.rule as { days: number }).days)
    const later = UNLOCKS.slice(16).filter((u) => u.rule.type === 'streak').map((u) => (u.rule as { days: number }).days)
    expect(later.length).toBeGreaterThan(0)
    expect(later[0]).toBeGreaterThan(Math.max(...first))
    for (let i = 1; i < later.length; i++) expect(later[i]).toBeGreaterThan(later[i - 1])
  })

  it('the first unlock is the red beanie at one chore, the first-session gift', () => {
    expect(UNLOCKS[0]).toMatchObject({ id: 'item:beanie-red', rule: { type: 'chores', count: 1 } })
  })

  it('the first 16 unlocks are unchanged, in order', () => {
    expect(ids(UNLOCKS.slice(0, 16))).toEqual([
      'item:beanie-red',
      'decor:teddy',
      'wall:mint',
      'item:bow',
      'decor:lamp',
      'floor:tile',
      'item:glasses',
      'decor:poster',
      'wall:lavender',
      'item:scarf',
      'decor:fairy-lights',
      'item:bow-tie',
      'floor:carpet',
      'item:backpack',
      'item:knit-sweater',
      'item:leaf-crown',
    ])
  })

  it('the second tier follows the first in order', () => {
    expect(ids(UNLOCKS.slice(16))).toEqual([
      'item:chef-hat',
      'wall:sky',
      'decor:bookshelf',
      'item:heart-glasses',
      'floor:seaside',
      'item:bandana',
      'decor:wall-clock',
      'item:apron',
      'decor:bean-bag',
      'item:crown',
    ])
  })

  it('the second tier thresholds hold exactly: 60, 75, 90, 110, 130, 150, 175, 200 chores and 21, 30 days', () => {
    expect(choreUnlocks().slice(-8).map((u) => (u.rule as { count: number }).count)).toEqual([60, 75, 90, 110, 130, 150, 175, 200])
    expect(streakUnlocks().slice(-2).map((u) => (u.rule as { days: number }).days)).toEqual([21, 30])
  })

  it('the second tier unlocks exactly at its thresholds, not one before', () => {
    expect(ids(applyUnlocks(progress({ choreCount: 59 }), 0).unlocked)).not.toContain('item:chef-hat')
    expect(ids(applyUnlocks(progress({ choreCount: 60 }), 0).unlocked)).toContain('item:chef-hat')
    expect(ids(applyUnlocks(progress(), 20).unlocked)).not.toContain('wall:sky')
    expect(ids(applyUnlocks(progress(), 21).unlocked)).toContain('wall:sky')
    expect(ids(applyUnlocks(progress(), 29).unlocked)).not.toContain('floor:seaside')
    expect(ids(applyUnlocks(progress(), 30).unlocked)).toContain('floor:seaside')
  })
})

describe('applyUnlocks and nextUnlocks across the second tier', () => {
  it('200 chores and a 30-day streak earn every unlock, in list order', () => {
    const { unlocked, progress: p } = applyUnlocks(progress({ choreCount: 200 }), 30)
    expect(ids(unlocked)).toEqual(ids(UNLOCKS))
    expect(p.unlockedItems).toEqual(ids(UNLOCKS))
  })

  it('at 55 chores the next chore reward is the chef hat at 60, five to go', () => {
    const next = nextUnlocks(earnedChores(55), 0)
    expect(next.chores).toMatchObject({ unlock: { id: 'item:chef-hat' }, remaining: 5 })
  })

  it('at 150 chores, with the apron earned, the next chore reward is the bean bag at 175', () => {
    const next = nextUnlocks(earnedChores(150), 0)
    expect(next.chores).toMatchObject({ unlock: { id: 'decor:bean-bag' }, remaining: 25 })
  })

  it('at 200 chores there is no next chore reward', () => {
    expect(nextUnlocks(earnedChores(200), 0).chores).toBeNull()
  })

  it('the next streak reward after 21 days is the seaside tiles at 30, nine to go', () => {
    const p = applyUnlocks(progress(), 21).progress
    expect(nextUnlocks(p, 21).streak).toMatchObject({ unlock: { id: 'floor:seaside' }, remaining: 9 })
  })
})

describe('room styles use palette colours only', () => {
  const palette = new Set<string>(Object.values(PALETTE))

  it('every floor colour is a PALETTE value', () => {
    for (const s of FLOOR_STYLES) {
      for (const [key, colour] of Object.entries({ top: s.top, alt: s.alt, edgeLeft: s.edgeLeft, edgeRight: s.edgeRight })) {
        expect(palette.has(colour), `${s.id}.${key} = ${colour}`).toBe(true)
      }
    }
  })

  it('every wall colour is a PALETTE value', () => {
    for (const s of WALL_STYLES) {
      for (const [key, colour] of Object.entries({ left: s.left, right: s.right })) {
        expect(palette.has(colour), `${s.id}.${key} = ${colour}`).toBe(true)
      }
    }
  })

  it('styles.ts has no raw hex literals', () => {
    expect(stylesSource.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
  })
})

describe('new objects render every stage', () => {
  for (const id of ['bookshelf', 'wall-clock', 'bean-bag', 'counter', 'dining-table']) {
    it(`${id} renders clean, messy1 and messy2`, () => {
      const art = OBJECT_ART[id]
      expect(art, id).toBeDefined()
      expect(art.catalogId).toBe(id)
      for (const stage of ['clean', 'messy1', 'messy2'] as const) {
        const node = art.render(stage)
        expect(node, `${id} ${stage}`).not.toBeNull()
        expect(isValidElement(node), `${id} ${stage}`).toBe(true)
      }
    })
  }
})

describe('new items render for every species', () => {
  for (const id of ['chef-hat', 'heart-glasses', 'bandana', 'apron', 'crown']) {
    it(`${id} renders for every species`, () => {
      const item = ITEMS.find((i) => i.id === id)
      expect(item, id).toBeDefined()
      for (const species of SPECIES) {
        const node = item!.render({ species })
        expect(node, `${id} ${species}`).not.toBeNull()
        expect(isValidElement(node), `${id} ${species}`).toBe(true)
      }
    })
  }
})
