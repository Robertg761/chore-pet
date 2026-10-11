import { backpack, backpackStraps, bandana, bowTie, glasses, heartGlasses, scarf } from './items/extras'
import { beanie, bow, chefHat, crown, leafCrown } from './items/hats'
import { apron, dress, dressSkirt, hoodie, overalls, sweater } from './items/outfits'
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
  { id: 'chef-hat', slot: 'head', name: "Chef's hat", render: chefHat },
  { id: 'heart-glasses', slot: 'face', name: 'Heart glasses', render: heartGlasses },
  { id: 'bandana', slot: 'neck', name: 'Bandana', render: bandana },
  { id: 'apron', slot: 'outfit', name: 'Apron', render: apron },
  { id: 'crown', slot: 'head', name: 'Golden crown', render: crown },
]
