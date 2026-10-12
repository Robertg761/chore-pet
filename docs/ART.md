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
| wall-sky-left | #A3CFEA | sky wall style, left wall |
| wall-sky-right | #C9E6F7 | sky wall style, right wall |
| wall-cloud-left | #B4C8D6 | cloud wall style (bathroom start), left wall |
| wall-cloud-right | #D3E2EC | cloud wall style, right wall |
| wall-butter-left | #F2DA94 | butter wall style (bedroom start), left wall |
| wall-butter-right | #F9EBC0 | butter wall style, right wall |
| wall-sage-left | #B3C6A2 | sage wall style (living room start), left wall |
| wall-sage-right | #D2E0C4 | sage wall style, right wall |
| floor-mosaic | #D6ECE4 | mosaic floor top (bathroom start) |
| floor-mosaic-alt | #BBDBD0 | mosaic floor, second small tile |
| floor-mosaic-dark | #7DA698 | mosaic slab left-front edge |
| floor-mosaic-side | #9CC3B6 | mosaic slab right-front edge |
| floor-oat | #EAD8C4 | oat rug floor top (bedroom start) |
| floor-oat-border | #CFAE93 | oat rug border |
| floor-oat-dark | #A98468 | oat slab left-front edge |
| floor-oat-side | #C29F84 | oat slab right-front edge |
| floor-birch | #E7C99D | birch plank floor top (living room start) |
| floor-birch-dark | #B9926A | birch slab left-front edge |
| floor-birch-side | #D0AB81 | birch slab right-front edge |
| sky-dark | #6FAED6 | seaside floor slab edge, shaded blue faces |

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

`src/room/shell/` draws the room: back walls, floor and a window. Floor styles: `wood` (default, planks), `tile` (cream and steel checker), `carpet` (rose, with a rug border), `seaside` (white and sky checker). Wall styles: `peach` (default), `mint` (faint stripes), `lavender`, `sky` (faint stripes). Every wall style is a darker left wall plus a lighter right wall. Wall tops, baseboards and the window sill use `cream` / `cream-dark` in every style. Floor slab edges are drawn below the diamond so the room reads as a diorama.

Starting styles by room kind (free for everyone, never rewards, so a new room looks like a new room): kitchen and other `peach` + `wood`; bathroom `cloud` (pale blue-grey wall) + `mosaic` (soft seafoam floor of small checks, half-tile squares); bedroom `butter` (soft butter wall) + `oat` (oatmeal rug floor with a border); living room `sage` (grey-green wall) + `birch` (light blond planks). None of the new floors reuse the cream, steel or blue checker of the reward `tile` and `seaside`; the mosaic is greener and its squares are half the size.

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

### Sampled character motion

`src/character/motion.ts` samples deterministic frames. `AnimatedCharacterArt` composes those frames with the shared character layers; static `Character` and share-image callers keep their existing poses. Mochi's knot, Bun's ears, and Sprout's stem and leaves rotate around explicit attachment pivots.

- Apply torso scale and lean around `(100,181)`. Keep the shadow in ground coordinates outside the torso transform. Walking stance feet compensate for the complete torso transform and world travel. During an unsupported jump with no explicit foot lifts or ground offsets, both feet follow the body's lift.
- Walking callers supply the full projected `groundPath`, including passed corners, in character SVG units. Keep its accumulated tile distance separate from projection and scale. Ground offsets hold stance landings against world translation. Mirror paired feet once, rebase frozen contacts when the container moves, and use `blendGroundFeet` to lift contacts being replanted during an interruption.
- Body outline, outfit clip, and wardrobe anchors share the same torso geometry and transform. Keep the slot order above, including front backpack straps. Preserve sick-bed and sleeping art and their hidden-slot rules during gentle notices.
- Walking phase follows accumulated route distance across tile boundaries. Departure fades in over 120ms and arrival fades out over 180ms across the whole journey. Do not restart the gait on each tile. Body lift stays within 24 SVG units; sampled scale stays within `[0.85,1.15]`.
- Greeting, affection, celebration, and big celebration last 1200, 1600, 1800, and 2200ms. Finite actions recover to their mood pose. Interruptions preserve the visible fractional world position and blend from the outgoing sampled pose. Rapid taps allow one pending response and reuse the same decorative accent nodes.
- Sampled art owns breathing, blinks, limb motion, and accents. Disable independent CSS breathing and blinking inside it. Reduced motion removes sampled displacement, gait, breathing, secondary sway, blinks, and animated accents while retaining still mood/reaction expressions. System preference changes apply during the session.
- Environmental profiles live in `src/pet/interactions.ts`. They choose reachable adjacent standing tiles and gaze points from the rotated object footprint. Kitchen profiles gaze at the rendered basin/plate stacks, pot knob/raised lid, retained freezer magnet, and tomato/takeout opening, with condition-specific points when needed. Current profiles use contact-free gestures; no paw-to-furniture contact geometry is verified. Do not depict chores being completed or sitting on furniture without dedicated anchors and occlusion rules.
- Idle resident attention eases toward mouse/pen input or keyboard focus over 120 ms on the existing room clock. Map through the outer pet group's screen transform, then compensate horizontal gaze for facing. Real actions take priority. Reduced motion, sick/away states, and hidden hover reset suppress the cue; touch movement does not activate it.
- Dark body colors use small cream backdrops behind the shared eyes, brows, and mouth when facial ink would lose contrast. Keep the selected body color and existing facial paths; light colors retain their original treatment. Check static and sampled open, blinking, pleased, sleeping, and tired expressions with glasses.

## Reviewing art

Open `/?art` in the dev server for the art gallery (`src/dev/ArtGallery.tsx`): every species in every mood, items on every pose, the 60 px check, body colours, and every object in all three stages with its bounds drawn. Add new poses, items and objects to it as they land.

The deterministic motion panel uses the production sampler and renderer. Compare 200px, 60px, and 25px previews, play at 1×/0.5×/0.25×, and scrub exact milliseconds or choose a key frame. Ground line and ground-anchor overlays are optional. Furniture contact overlay is unavailable because the standalone panel supplies no contact geometry. Review settings stay local to the panel; the system reduced-motion preference remains authoritative over its local override.

Use playback and real-room checks to judge grounding, clipping, interrupted motion, and gaze. Numeric continuity and SVG attachment tests support that review but do not establish visual quality by themselves.

The wardrobe main preview uses the sampled renderer at rest and offers finite Wave and Hop controls. The active control becomes its Stop button; other movements wait. Pose selection stops playback. Live reduced motion settles before paint and does not replay when restored. Item grids and outfit thumbnails retain their static renderers, and frame updates stay inside the preview. Previewing never saves pet changes.
