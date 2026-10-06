import { describe, expect, it } from 'vitest'
import type { Item } from '../character/slots'
import type { Progress, SavedOutfit } from '../domain/types'
import { UNLOCKS } from '../domain/unlocks'
import {
  MAX_OUTFITS,
  WARDROBE_SLOTS,
  activeOutfit,
  addOutfit,
  cleanOutfitName,
  clearSlot,
  defaultOutfitName,
  describeOutfit,
  isEmptyOutfit,
  isFull,
  itemsForSlot,
  removeOutfit,
  replaceOutfit,
  sameOutfit,
  toggleItem,
  wearableOutfit,
} from './wardrobeModel'

const progress = (unlockedItems: string[] = []): Progress => ({ homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems })
const item = (id: string, slot: Item['slot'], name = id): Item => ({ id, slot, name, render: () => null })
const ITEMS: Item[] = [item('beanie-red', 'head', 'Red beanie'), item('bow', 'head', 'Bow'), item('hoodie', 'outfit', 'Hoodie'), item('knit-sweater', 'outfit', 'Cosy knit sweater'), item('leaf-crown', 'head', 'Leaf crown'), item('mystery', 'face')]
const outfit = (id: string, name: string, equipped: SavedOutfit['equipped'] = {}): SavedOutfit => ({ id, name, equipped })

describe('wardrobeModel', () => {
  it('has a tab for every dressable slot, not the body', () => {
    expect(WARDROBE_SLOTS.map((s) => s.slot)).toEqual(['head', 'face', 'neck', 'outfit', 'back'])
  })

  it('lists owned items first, then locked ones in the order they are earned', () => {
    const entries = itemsForSlot('head', progress(['item:bow']), ITEMS)
    expect(entries.map((e) => [e.item.id, e.unlocked])).toEqual([
      ['bow', true],
      ['beanie-red', false],
      ['leaf-crown', false],
    ])
  })

  it('says how to earn a locked item', () => {
    const entries = itemsForSlot('outfit', progress(), ITEMS)
    expect(entries.find((e) => e.item.id === 'knit-sweater')).toMatchObject({ unlocked: false, requirement: '10-day streak' })
    expect(itemsForSlot('head', progress(), ITEMS).find((e) => e.item.id === 'leaf-crown')?.requirement).toBe('50 chores')
  })

  it('treats the free outfits as owned', () => {
    const hoodie = itemsForSlot('outfit', null, ITEMS).find((e) => e.item.id === 'hoodie')
    expect(hoodie).toMatchObject({ unlocked: true, requirement: null })
  })

  it('has no wording for a locked item without a rule', () => {
    expect(itemsForSlot('face', progress(), ITEMS)[0]).toMatchObject({ unlocked: false, requirement: null })
  })

  it('uses real unlock rules for the earned set', () => {
    expect(UNLOCKS.some((x) => x.id === 'item:knit-sweater')).toBe(true)
  })

  it('puts an item on, swaps it, and takes it off by tapping it again', () => {
    const on = toggleItem({}, 'head', 'bow')
    expect(on).toEqual({ head: 'bow' })
    expect(toggleItem(on, 'head', 'beanie-red')).toEqual({ head: 'beanie-red' })
    expect(toggleItem(on, 'head', 'bow')).toEqual({})
    expect(toggleItem({ neck: 'scarf', head: 'bow' }, 'head', 'bow')).toEqual({ neck: 'scarf' })
  })

  it('clears a slot without touching the others', () => {
    expect(clearSlot({ head: 'bow', neck: 'scarf' }, 'head')).toEqual({ neck: 'scarf' })
  })

  it('does not change the outfit it was given', () => {
    const before = { head: 'bow' }
    toggleItem(before, 'head', 'bow')
    expect(before).toEqual({ head: 'bow' })
  })

  it('compares outfits by what is worn', () => {
    expect(sameOutfit({ head: 'bow', neck: 'scarf' }, { neck: 'scarf', head: 'bow' })).toBe(true)
    expect(sameOutfit({ head: 'bow' }, { head: 'beanie-red' })).toBe(false)
    expect(sameOutfit({ head: 'bow' }, { head: 'bow', neck: 'scarf' })).toBe(false)
    expect(sameOutfit({}, { head: undefined })).toBe(true)
    expect(sameOutfit({ body: 'x' }, {})).toBe(true)
    expect(isEmptyOutfit({})).toBe(true)
    expect(isEmptyOutfit({ face: 'glasses' })).toBe(false)
  })

  it('finds the saved outfit that is being worn', () => {
    const list = [outfit('a', 'Outfit 1', { head: 'bow' }), outfit('b', 'Outfit 2', { neck: 'scarf' })]
    expect(activeOutfit(list, { neck: 'scarf' })?.id).toBe('b')
    expect(activeOutfit(list, { neck: 'scarf', head: 'bow' })).toBeUndefined()
  })

  it('leaves off anything not owned or not drawn when trying an outfit on', () => {
    const got = wearableOutfit({ head: 'beanie-red', outfit: 'hoodie', face: 'ghost', neck: 'bow' }, progress(), ITEMS)
    expect(got).toEqual({ outfit: 'hoodie' })
    expect(wearableOutfit({ head: 'beanie-red' }, progress(['item:beanie-red']), ITEMS)).toEqual({ head: 'beanie-red' })
  })

  it('describes the outfit', () => {
    expect(describeOutfit({}, ITEMS)).toBe('nothing yet')
    expect(describeOutfit({ head: 'bow', outfit: 'hoodie' }, ITEMS)).toBe('Bow, Hoodie')
  })

  it('names outfits "Outfit 1".. using the first free number', () => {
    expect(defaultOutfitName([])).toBe('Outfit 1')
    expect(defaultOutfitName([outfit('a', 'Outfit 1'), outfit('b', 'Outfit 3')])).toBe('Outfit 2')
    expect(defaultOutfitName([outfit('a', 'outfit 1')])).toBe('Outfit 2')
  })

  it('trims names and cuts them at 16 characters', () => {
    expect(cleanOutfitName('  Cosy  ')).toBe('Cosy')
    expect(cleanOutfitName('A very long outfit name indeed')).toHaveLength(16)
    expect(cleanOutfitName('   ')).toBe('')
  })

  it('adds an outfit with a cleaned or default name', () => {
    const one = addOutfit([], '  Party ', { head: 'bow' }, 'id1')
    expect(one).toEqual([{ id: 'id1', name: 'Party', equipped: { head: 'bow' } }])
    expect(addOutfit(one, '', { neck: 'scarf' }, 'id2')[1].name).toBe('Outfit 1')
  })

  it('stores a copy, so later changes do not leak into the saved outfit', () => {
    const worn = { head: 'bow' }
    const list = addOutfit([], 'A', worn, 'a')
    worn.head = 'beanie-red'
    expect(list[0].equipped).toEqual({ head: 'bow' })
  })

  it('keeps at most three outfits', () => {
    let list: SavedOutfit[] = []
    for (let i = 0; i < MAX_OUTFITS; i++) list = addOutfit(list, `O${i}`, { head: 'bow' }, `id${i}`)
    expect(isFull(list)).toBe(true)
    expect(addOutfit(list, 'Extra', {}, 'x')).toBe(list)
  })

  it('replaces an outfit in place, keeping the name unless given a new one', () => {
    const list = [outfit('a', 'One', { head: 'bow' }), outfit('b', 'Two')]
    expect(replaceOutfit(list, 'a', { neck: 'scarf' })).toEqual([outfit('a', 'One', { neck: 'scarf' }), outfit('b', 'Two')])
    expect(replaceOutfit(list, 'b', { neck: 'scarf' }, 'Fresh')[1].name).toBe('Fresh')
    expect(replaceOutfit(list, 'b', {}, '  ')[1].name).toBe('Two')
  })

  it('removes an outfit and frees a spot', () => {
    const list = [outfit('a', 'One'), outfit('b', 'Two'), outfit('c', 'Three')]
    const fewer = removeOutfit(list, 'b')
    expect(fewer.map((o) => o.id)).toEqual(['a', 'c'])
    expect(isFull(fewer)).toBe(false)
    expect(removeOutfit(fewer, 'zzz')).toEqual(fewer)
  })
})
