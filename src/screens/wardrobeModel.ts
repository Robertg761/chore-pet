import { ITEMS } from '../character/items'
import type { Item } from '../character/slots'
import type { Pet, Progress, SavedOutfit } from '../domain/types'
import { UNLOCKS, isUnlocked } from '../domain/unlocks'
import type { PoseName } from '../character/poses'
import { requirementLabel, withEquipped } from './rewardsModel'

// Pure helpers for the wardrobe. Which items are earned comes from
// src/domain/unlocks.ts; this only arranges them for the screen.

export type WardrobeSlot = Item['slot']
type Equipped = Pet['equipped']

/** The tabs, in the order they appear. The body slot is not dressable. */
export const WARDROBE_SLOTS: { slot: WardrobeSlot; label: string }[] = [
  { slot: 'head', label: 'Head' },
  { slot: 'face', label: 'Face' },
  { slot: 'neck', label: 'Neck' },
  { slot: 'outfit', label: 'Outfit' },
  { slot: 'back', label: 'On back' },
]

/** The poses the player can check an outfit in. */
export const WARDROBE_POSES: { pose: PoseName; label: string }[] = [
  { pose: 'idle', label: 'Happy' },
  { pose: 'sleeping', label: 'Sleepy' },
  { pose: 'cheering', label: 'Cheer' },
  { pose: 'sick', label: 'Poorly' },
]

export const MAX_OUTFITS = 3
export const MAX_OUTFIT_NAME = 16

export interface WardrobeEntry {
  item: Item
  unlocked: boolean
  /** How to earn a locked item ("7-day streak"), or null when it is unlocked or has no rule yet. */
  requirement: string | null
}

/** Every item for a slot: the ones the player has first, then locked gifts in the order they are earned. */
export function itemsForSlot(slot: WardrobeSlot, progress: Pick<Progress, 'unlockedItems'> | null, items: Item[] = ITEMS): WardrobeEntry[] {
  const entries = items
    .filter((item) => item.slot === slot)
    .map((item): WardrobeEntry => {
      const id = `item:${item.id}`
      const unlocked = isUnlocked(progress, id)
      const rule = UNLOCKS.find((x) => x.id === id)?.rule
      return { item, unlocked, requirement: !unlocked && rule ? requirementLabel(rule) : null }
    })
  const order = (e: WardrobeEntry) => UNLOCKS.findIndex((x) => x.id === `item:${e.item.id}`)
  return [...entries.filter((e) => e.unlocked), ...entries.filter((e) => !e.unlocked).sort((a, b) => order(a) - order(b))]
}

/** Puts an item on, or takes it off when it is already worn. One item per slot. */
export function toggleItem(equipped: Equipped, slot: WardrobeSlot, itemId: string): Equipped {
  return withEquipped(equipped, slot, equipped[slot] === itemId ? null : itemId)
}

/** Takes whatever is in the slot off. */
export function clearSlot(equipped: Equipped, slot: WardrobeSlot): Equipped {
  return withEquipped(equipped, slot, null)
}

/** Only the dressable slots that hold something, so outfits compare by what is worn. */
function worn(equipped: Equipped): [string, string][] {
  return WARDROBE_SLOTS.flatMap(({ slot }) => (equipped[slot] ? [[slot, equipped[slot] as string] as [string, string]] : []))
}

export function sameOutfit(a: Equipped, b: Equipped): boolean {
  const x = worn(a)
  const y = worn(b)
  return x.length === y.length && x.every(([slot, id]) => b[slot as WardrobeSlot] === id)
}

export function isEmptyOutfit(equipped: Equipped): boolean {
  return worn(equipped).length === 0
}

/** An outfit with anything the player doesn't have (or that can't be drawn) left off. */
export function wearableOutfit(equipped: Equipped, progress: Pick<Progress, 'unlockedItems'> | null, items: Item[] = ITEMS): Equipped {
  let result: Equipped = {}
  for (const [slot, id] of worn(equipped)) {
    const item = items.find((i) => i.id === id && i.slot === slot)
    if (item && isUnlocked(progress, `item:${id}`)) result = { ...result, [slot]: id }
  }
  return result
}

/** "Red beanie, Scarf", or "nothing yet" for the preview's description. */
export function describeOutfit(equipped: Equipped, items: Item[] = ITEMS): string {
  const names = worn(equipped).flatMap(([slot, id]) => {
    const item = items.find((i) => i.id === id && i.slot === slot)
    return item ? [item.name] : []
  })
  return names.length > 0 ? names.join(', ') : 'nothing yet'
}

/** Names are trimmed and cut to the limit. */
export function cleanOutfitName(name: string): string {
  return name.trim().slice(0, MAX_OUTFIT_NAME).trim()
}

/** The first "Outfit 1", "Outfit 2"... not already used. */
export function defaultOutfitName(outfits: SavedOutfit[]): string {
  const used = new Set(outfits.map((o) => o.name.toLowerCase()))
  for (let n = 1; ; n++) {
    const name = `Outfit ${n}`
    if (!used.has(name.toLowerCase())) return name
  }
}

export function isFull(outfits: SavedOutfit[]): boolean {
  return outfits.length >= MAX_OUTFITS
}

/** The saved outfit that matches what is worn, if any. */
export function activeOutfit(outfits: SavedOutfit[], equipped: Equipped): SavedOutfit | undefined {
  return outfits.find((o) => sameOutfit(o.equipped, equipped))
}

/** Adds an outfit at the end. Does nothing when full or the name is empty. */
export function addOutfit(outfits: SavedOutfit[], name: string, equipped: Equipped, id: string): SavedOutfit[] {
  const clean = cleanOutfitName(name) || defaultOutfitName(outfits)
  if (isFull(outfits)) return outfits
  return [...outfits, { id, name: clean, equipped: { ...equipped } }]
}

/** Swaps what a saved outfit holds (and optionally its name), keeping its place in the row. */
export function replaceOutfit(outfits: SavedOutfit[], id: string, equipped: Equipped, name?: string): SavedOutfit[] {
  const clean = name === undefined ? undefined : cleanOutfitName(name)
  return outfits.map((o) => (o.id === id ? { ...o, name: clean || o.name, equipped: { ...equipped } } : o))
}

export function removeOutfit(outfits: SavedOutfit[], id: string): SavedOutfit[] {
  return outfits.filter((o) => o.id !== id)
}
