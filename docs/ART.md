# Art Direction

Every asset is hand-authored SVG, designed from scratch. No asset packs, no raster images. This file is the contract every art task follows.

## Style: cozy outline

- One outline colour everywhere: `#2B1E2F`. Stroke 4 in a 200x200 character viewBox, 3 at room scale. Round joins and caps.
- Flat fills, at most one darker shade per face. No gradients, except soft shadows (outline colour at 15% opacity).
- Rounded shapes over sharp ones. Nothing looks threatening, even when messy.
- Mess is funny, never gross: cartoon flies, colourful piles, a stink line or two.
- No text baked into art.

## Palette tokens

| Token | Hex | Use |
| --- | --- | --- |
| ink | #2B1E2F | outlines, eyes, dark UI |
| ground | #EFE9FF | app background |
| accent | #6F5CF0 | selection, focus |
| wall-left | #F4B8A0 | left wall |
| wall-right | #F9D0BC | right wall |
| floor-wood | #D19A6A | default floor |
| wood-dark | #A0673F | furniture sides |
| fabric-blue | #6F95F0 | bedding, scarves |
| warm-red | #E86A4A | hats, bows |
| sky | #9ED8F5 | windows, ice packs |
| blush | #F28FA0 | cheeks |
| pet-default | #FFD65C | default body colour |
| sick-tint | #7BAE3A | overlay at 18% (scruffy) / 32% (sick) |
| dirt | #8A6A4A | smudges at 45% |

## Isometric room

- 2:1 isometric. Room floor is a diamond; one tile step along the left wall is (+w/2, -h/2) and along the right wall (+w/2, +h/2), with h = w/2.
- Reference room (390 px wide): floor corners (195,170) (365,265) (195,360) (25,265); walls 160 px tall; 6x6 tiles.
- Objects are drawn as three visible faces (top, left-front, right-front) using the face shading above.
- Each catalog object ships as `clean`, `messy1` (a little behind) and `messy2` (very behind), same footprint and bounding box.

## Character

Final concept not chosen yet. Candidates are on the design canvas: **Mochi** (dumpling blob), **Bun** (bunny, ears show mood), **Sprout** (leaf wilts when chores slip). The lead picks with Robert; nothing else waits on it except visible character art.

Rules for whichever wins:

- Round silhouette that reads at 60 px. Big eyes, small mouth, short limbs.
- Moods via face and posture only: happy, content, meh, scruffy, sick (in bed, thermometer), plus sleeping and cheering.
- Drawn in a 200x200 viewBox, feet near y = 180.

### Layered slots

Items attach to named anchors so one hat works in every pose. Draw order, back to front:

1. back (backpack, wings), drawn behind the body
2. body (colour swappable)
3. outfit (shirt, overalls, hoodie)
4. neck (scarf, bow tie)
5. face (glasses, blush variants)
6. head (hats, bows, headphones)

Every pose defines all six anchors (`src/character/slots.ts`). Items are drawn centred on (0,0) and transformed onto the anchor. A new item must look right on every existing pose before it ships.
