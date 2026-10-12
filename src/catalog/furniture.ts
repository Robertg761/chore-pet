import type { CatalogEntry } from './types'

/** Free furniture. Each family keeps the same footprint and chores across all looks. */
export const FURNITURE: CatalogEntry[] = [
  {
    id: 'armchair', name: 'Armchair', category: 'seating', rooms: ['living', 'bedroom'],
    description: 'A reading chair with a padded seat, back cushion and shaped arms.',
    footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Vacuum the armchair', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'dining-chair', name: 'Dining chair', category: 'seating', rooms: ['kitchen', 'living'],
    description: 'A small dining chair with a custom frame and upholstered seat.',
    footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Wipe the dining chairs', schedule: { kind: 'everyNDays', n: 7 } }],
  },
  {
    id: 'bench', name: 'Bench', category: 'seating', rooms: ['living', 'bedroom', 'other'],
    description: 'An entryway or end-of-bed bench with a long cushioned seat.',
    footprint: { w: 1, d: 2 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Dust the bench', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'ottoman', name: 'Ottoman', category: 'seating', rooms: ['living', 'bedroom'],
    description: 'A soft footrest with a patterned top and contrasting base.',
    footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Brush the ottoman', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'coffee-table', name: 'Coffee table', category: 'tables', rooms: ['living'],
    description: 'A low table for books and mugs, with styled legs and a shelf.',
    footprint: { w: 2, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Wipe the coffee table', schedule: { kind: 'everyNDays', n: 3 } }],
  },
  {
    id: 'side-table', name: 'Side table', category: 'tables', rooms: ['living', 'bedroom'],
    description: 'A compact accent table that fits beside a favorite chair.',
    footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Dust the side table', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'desk', name: 'Writing desk', category: 'tables', rooms: ['bedroom', 'living', 'other'],
    description: 'A workspace with a writing pad, little drawers and a pencil cup.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Clear the desk', schedule: { kind: 'weekly', weekday: 5 } }],
  },
  {
    id: 'nightstand', name: 'Nightstand', category: 'bedroom', rooms: ['bedroom'],
    description: 'A bedside cabinet with a drawer and a little shelf for books.',
    footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Dust the nightstand', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'dresser', name: 'Dresser', category: 'storage', rooms: ['bedroom'],
    description: 'A chest of drawers with custom fronts, handles and a tray on top.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', mess: 'dust',
    chores: [
      { name: 'Dust the dresser', schedule: { kind: 'everyNDays', n: 14 } },
      { name: 'Tidy the drawers', schedule: { kind: 'monthly', dayOfMonth: 12 } },
    ],
  },
  {
    id: 'wardrobe', name: 'Wardrobe', category: 'storage', rooms: ['bedroom'],
    description: 'A tall clothes cabinet with paneled doors and matching handles.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Organize the wardrobe', schedule: { kind: 'monthly', dayOfMonth: 18 } }],
  },
  {
    id: 'tv-stand', name: 'TV stand', category: 'storage', rooms: ['living'],
    description: 'A low media console with cubbies, cabinet doors and a small screen.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Dust the TV stand', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'shoe-rack', name: 'Shoe rack', category: 'storage', rooms: ['living', 'bedroom', 'other'],
    description: 'Open shelves with pairs of tiny shoes and a sturdy frame.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Tidy the shoe rack', schedule: { kind: 'weekly', weekday: 0 } }],
  },
  {
    id: 'bathtub', name: 'Bathtub', category: 'bathroom', rooms: ['bathroom'],
    description: 'A deep soaking tub with styled feet, a rim and a little bath tray.',
    footprint: { w: 2, d: 2 }, placement: 'wall', layer: 'solid', mess: 'stink',
    chores: [{ name: 'Scrub the bathtub', schedule: { kind: 'weekly', weekday: 6 } }],
  },
  {
    id: 'bathroom-vanity', name: 'Bathroom vanity', category: 'bathroom', rooms: ['bathroom'],
    description: 'A washbasin cabinet with drawers, a tap and folded towels.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', mess: 'stink',
    chores: [{ name: 'Wipe the bathroom vanity', schedule: { kind: 'everyNDays', n: 3 } }],
  },
  {
    id: 'laundry-hamper', name: 'Laundry hamper', category: 'bathroom', rooms: ['bathroom', 'bedroom'],
    description: 'A lidded clothes basket with a fabric liner and woven sides.',
    footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Empty the laundry hamper', schedule: { kind: 'weekly', weekday: 4 } }],
  },
  {
    id: 'mirror', name: 'Wall mirror', category: 'decor', rooms: ['bathroom', 'bedroom', 'living'],
    description: 'A framed mirror that hangs above furniture without using floor space.',
    footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'hung', mess: 'dust',
    chores: [{ name: 'Polish the mirror', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'wall-shelf', name: 'Wall shelf', category: 'storage', rooms: ['living', 'bedroom', 'kitchen', 'other'],
    description: 'A wall-mounted shelf with books, brackets and a small plant.',
    footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'hung', mess: 'dust',
    chores: [{ name: 'Dust the wall shelf', schedule: { kind: 'everyNDays', n: 14 } }],
  },
  {
    id: 'pet-bed', name: 'Pet bed', category: 'bedroom', rooms: ['living', 'bedroom'],
    description: 'A cozy little nest with a washable cushion and a favorite toy.',
    footprint: { w: 2, d: 1 }, placement: 'floor', layer: 'solid', mess: 'dust',
    chores: [{ name: 'Wash the pet bedding', schedule: { kind: 'everyNDays', n: 14 } }],
  },
]
