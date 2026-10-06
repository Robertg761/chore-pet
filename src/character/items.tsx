import { backpack, backpackStraps, bowTie, glasses, scarf } from './items/extras'
import { beanie, bow, leafCrown } from './items/hats'
import { dress, dressSkirt, hoodie, overalls, sweater } from './items/outfits'
import type { Item } from './slots'

// Every wearable item. The drawings live in ./items/, grouped by who owns them:
// hats (head), outfits (clipped to the body silhouette) and extras (face, neck,
// back). Each render gets the species so an item can be cut to fit each pet.

export const ITEMS: Item[] = [
  { id: 'beanie-red', slot: 'head', name: 'Red beanie', render: beanie },
  { id: 'bow', slot: 'head', name: 'Bow', render: bow },
  { id: 'glasses', slot: 'face', name: 'Round glasses', render: glasses },
  { id: 'scarf', slot: 'neck', name: 'Scarf', render: scarf },
  { id: 'bow-tie', slot: 'neck', name: 'Bow tie', render: bowTie },
  { id: 'backpack', slot: 'back', name: 'Backpack', render: backpack, front: backpackStraps },
  { id: 'hoodie', slot: 'outfit', name: 'Hoodie', render: hoodie },
  { id: 'overalls', slot: 'outfit', name: 'Overalls', render: overalls },
  { id: 'dress', slot: 'outfit', name: 'Dress', render: dress, front: dressSkirt },
  { id: 'knit-sweater', slot: 'outfit', name: 'Cosy knit sweater', render: sweater },
  { id: 'leaf-crown', slot: 'head', name: 'Autumn leaf crown', render: leafCrown },
]
