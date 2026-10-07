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
| pet-default | #FFD65C | Sprout's starting body colour |
| sakura | #FFCFDA | Mochi's starting body colour |
| sick-tint | #7BAE3A | overlay at 18% (scruffy) / 32% (sick) |
| dirt | #8A6A4A | smudges at 45% |
| leaf | #8CCB5E | Sprout's leaves and stem, plants |
| leaf-dark | #6FB24A | lower half of each leaf |
| cream | #FFF6E6 | countertops, light tops |
| cream-dark | #EBDCC6 | countertop edges, plate rims |
| steel | #C9D3E6 | taps, basins, metal |
| steel-dark | #97A3BE | basin insides, pot insides |
| white | #FFFFFF | eye highlights, plates, fly wings |
| floor-wood-side | #BC8559 | wood floor slab, right-front edge |
| floor-carpet-light | #F0B8C6 | carpet floor top |
| floor-carpet | #E29BAE | carpet slab right-front edge, rug border |
| floor-carpet-dark | #C27D93 | carpet slab left-front edge |
| wall-mint-left | #9FD4B6 | mint wall style, left wall |
| wall-mint-right | #C4EAD3 | mint wall style, right wall |
| wall-lavender-left | #BFAEE8 | lavender wall style, left wall |
| wall-lavender-right | #D9CDF5 | lavender wall style, right wall |

The tokens live in `src/art/palette.ts`; art code uses those names, never raw hex.

## Isometric room

- 2:1 isometric. Room floor is a diamond; one tile step along the left wall is (+w/2, -h/2) and along the right wall (+w/2, +h/2), with h = w/2.
- Reference room (390 px wide): the art is drawn for a 6x6 room with floor corners (195,170) (365,255) (195,340) (25,255) and walls 160 px tall. The live room is 8x8 (`ROOM_TILES`): the floor still spans 340 px, and walls, window, pet and effects shrink by `TILE_SCALE` (6/8) so proportions hold.
- Objects are drawn as three visible faces (top, left-front, right-front) using the face shading above.
- Each catalog object ships as `clean`, `messy1` (a little behind) and `messy2` (very behind), same footprint and bounding box.

### Object art contract

- Object art is drawn in object-local units where one tile is 64 x 32 (`src/room/iso.ts`). The origin is the back (top) corner of the footprint on the floor; +tx runs toward the lower right, +ty toward the lower left, +z up. Use `iso()` and `isoPoints()` rather than hand-computing corners. The room renderer scales art to its tile size.
- Each object exports an `ObjectArt` (`src/room/objects/types.ts`): catalog id, footprint, a fixed `bounds` box shared by all three stages, and `render(stage)`.
- Rotation 0 has the object's back against the left wall (tx = 0), so its front is the right-front face.
- Face shading: left-front face darker, right-front lighter, top lightest (same light as the walls).
- Mess goes on top of the clean drawing: `messy1` is one or two things (a couple of plates, one fly), `messy2` is a funny pile (stacked dishes, three flies, stink lines, a drip). Use the shared pieces in `src/room/objects/mess.tsx` (`fly`, `stink`, `smudge`, `plate`) so mess looks like one world.
- **Reference object: the sink** (`src/room/objects/sink.tsx`). Copy its structure: cabinet faces, fixtures, then mess layers.

### Room shell styles

`src/room/shell/` draws the room: back walls, floor and a window. Floor styles: `wood` (default, planks), `tile` (cream and steel checker), `carpet` (rose, with a rug border). Wall styles: `peach` (default), `mint` (faint stripes), `lavender`. Every wall style is a darker left wall plus a lighter right wall. Wall tops, baseboards and the window sill use `cream` / `cream-dark` in every style. Floor slab edges are drawn below the diamond so the room reads as a diorama.

## Characters

All three concepts ship and the player picks one:

- **Mochi** (`src/character/species/mochi.tsx`): a soft dumpling with a pinched top and two pleat lines. The widest silhouette.
- **Bun** (`src/character/species/bun.tsx`): a round bunny. Ears show mood: upright when happy, one flopped when meh, drooping down the sides when scruffy or sick (`EAR_DROOP`).
- **Sprout** (`src/character/species/sprout.tsx`): a gumdrop seedling with a stem and two leaves. Leaves wilt with mood (`WILT`).

They are one family. Shared parts live in `src/character/parts.tsx` and every species uses them: the same body shading, eyes, mouth, cheeks, feet and arm nubs, ground shadow, and mood tint. Don't draw a species-specific face.

- **Body:** always draw the body with `<Body d={BODY} colour={...} highlight={HIGHLIGHT} />`. It adds the one darker shade (the body colour blended toward warm rose, `bodyShade()` in `src/art/color.ts`, so any player colour shades nicely), a soft top-left highlight, then the outline.
- **Eyes:** big, glossy and wide-set (two highlights). Low moods change the eyes, never with lids that look unimpressed: meh is slightly smaller eyes, scruffy and sick add worried brows (inner ends higher).
- **Mochi's top** is a pinched knot with pleats fanning out (`mochiKnot`, `mochiPleats`), never a curl that reads as hair.

Rules for every pose of every species:

- Round silhouette that reads at 60 px. Big eyes, small mouth, short limbs.
- Moods via face and posture only: happy, content, meh, scruffy, sick (in bed, thermometer), plus sleeping and cheering. Scruffy looks tired, never angry; sick looks uncomfortable, never dead (no X eyes).
- Scruffy adds a faint green cast and two or three dirt smudges; sick goes pale (white wash) with a light green cast (`MoodTint`). Never olive or brown.
- Drawn in a 200x200 viewBox, feet near y = 180.
- Each pet starts in its own colour (`SPECIES_COLOUR` in `src/art/palette.ts`): sakura-pink Mochi, snow-white Bun, sunny-yellow Sprout. Body colour is swappable; check new art on each pet's own colour plus yellow, pink, sky and white.
- Poses are registered per species in `src/character/poses.ts` (`idle` is happy). A missing pose falls back to idle.

### Layered slots

Items attach to named anchors so one hat works in every pose. Draw order, back to front:

1. back (backpack, wings), drawn behind the body
2. body (colour swappable)
3. outfit (shirt, overalls, hoodie)
4. neck (scarf, bow tie)
5. face (glasses, blush variants)
6. head (hats, bows, headphones)

Every pose defines all six anchors (`src/character/slots.ts`). Items are drawn centred on (0,0) and transformed onto the anchor. Anchors may carry a `scale` so one item fits each species' head. A new item must look right on every existing pose of every species before it ships.

## Reviewing art

Open `/?art` in the dev server for the art gallery (`src/dev/ArtGallery.tsx`): every species in every mood, items on every pose, the 60 px check, body colours, and every object in all three stages with its bounds drawn. Add new poses, items and objects to it as they land.
