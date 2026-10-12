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
- Sampled reaction marks emerge at their own anchors on the existing finite opacity envelope. The heart grows from 82% and rises 2 SVG units; the star grows from 70% and rises 4. Peak geometry and static cheering art remain exact. The marks settle back as they fade; they add no clock, state, or nodes and remain suppressed for resting poses and reduced motion.
- Healthy pleased faces ease in over the first 18% of a greeting, pats, stretch, hop, cheer or environmental wave, and settle over the last 18%. Intermediate frames narrow the outgoing eyes with their current blink before crossfading the existing shapes; content/meh mouths crossfade, while the happy mouth stays single. One cream contrast backing follows the expression on dark bodies. The numeric expression weight also carries an interrupted smile through the existing 120 ms activity blend. Rest, full smiles, legacy omitted weights, sleeping and unwell art retain their existing geometry; reduced motion retains the full finite still reaction. No extra clock or saved state.
- Greeting and wardrobe waves use species-specific held hand sweeps. Bun retains its lively cadence, Mochi sweeps more slowly, and Sprout uses a smaller, slower wave. Preserve action durations, gesture envelopes, torso/feet/appendages, gaze, wardrobe attachment and reduced-motion stills.
- Sampled art owns breathing, blinks, limb motion, and accents. Disable independent CSS breathing and blinking inside it. Reduced motion removes sampled displacement, gait, breathing, secondary sway, blinks, and animated accents while retaining still mood/reaction expressions. System preference changes apply during the session.
- Idle appendages follow the existing four-second breath with a small species-specific delay; they settle to neutral position and zero velocity at the loop boundary. Feet, body position and shadow stay fixed. Primary140ms blinks keep their lifetime phase across actions; every other primary blink has a second140ms blink after60ms fully open. Sleeping and sick art retain their existing static geometry.
- Environmental profiles live in `src/pet/interactions.ts`. They choose reachable adjacent standing tiles and gaze points from the rotated object footprint. Kitchen profiles gaze at the rendered basin/plate stacks, pot knob/raised lid, retained freezer magnet, and tomato/takeout opening. Bathroom profiles follow the shower-head underside/water spot/steam smiley, toilet flush button/lid smudge/stained water line, and washer window/laundry/open-door fabric. Points follow the current condition. The remaining catalog profiles follow dishwasher controls/plate stacks, dining-table flower/place settings, coffee-table top/plates, trash handle/bags and retained recycling badge. The resident reserves additional front clearance for the folded messy2 dishwasher door, mirrored with its art; placement footprints remain fixed. Resident and multi-room routes share the same condition-aware pet obstacles. A clearance change replans travel from its current drawn position; closed fixtures restore their original routes. This changes pet navigation without changing placement footprints. Current profiles use contact-free gestures; no paw-to-furniture contact geometry is verified. Do not depict chores being completed or sitting on furniture without dedicated anchors and occlusion rules.
- Clean-object interactions use two calm observations for each of the24 catalog/decor entries, including reward decor. Select by the held interaction beat so turns, action and settling keep one line. Unmapped objects use calm mood content; dirty objects retain condition dialogue. Player responses take priority, and ambient observations remain silent in the live region.
- Idle resident attention eases toward mouse/pen input or keyboard focus over 120 ms on the existing room clock. Retain the input point through the outer pet group's screen transform, then aim from the actual species/mood eyes through the current torso and facing. A single scalar caps eye travel while preserving direction. Breathing updates geometry through the original easing deadline; only a new input source restarts it. Store the easing's horizontal cue in the outer axis so an outgoing cue keeps its world direction during a left/right turn. Real actions take priority. Reduced motion, sick/away states, and hidden hover reset suppress the cue; touch movement does not activate it.
- Dark body colors use small cream backdrops behind the shared eyes, brows, and mouth when facial ink would lose contrast. Keep the selected body color and existing facial paths; light colors retain their original treatment. Check static and sampled open, blinking, pleased, sleeping, and tired expressions with glasses.

## Reviewing art

Open `/?art` in the dev server for the art gallery (`src/dev/ArtGallery.tsx`): every species in every mood, items on every pose, the 60 px check, body colours, and every object in all three stages with its bounds drawn. Add new poses, items and objects to it as they land.

Gallery examples start still. Start example animations enables CSS animation only in visible gallery rows, using one observer and no frame clock. Stopping restores static art; hidden documents pause the existing intent. Live reduced motion cancels it without replay, and unsupported visibility tracking leaves examples still. The separate sampled motion panel retains its own controls. Sparkle and cheer examples replay only on request, with finite deadlines and bounded effect nodes. Either motion-preference change settles an active manual replay.

Cheer accents finish fading by the 1750ms cleanup deadline, or 1200ms under reduced motion. Preserve earlier accent timing and shorten only late marks; no visible accent should outlive its owner.

The deterministic motion panel uses the production sampler and renderer. Explicit playback pauses while its three previews are offscreen or the document is hidden, resuming at the same review time. A single native observer gates the existing clock; unsupported observation keeps manual playback available. The optional clock resume callback resets relative review timing before its first tick, preserving absolute resident timestamps and deadlines. Idle review spans12seconds to expose the complete blink pattern and three4-second breath cycles, while the sampler keeps its4000ms body duration. Species-specific primary blink, open-gap and second-blink comparison frames pause at exact times. Compare 200px, 60px, and 25px previews, play at 1×/0.5×/0.25×, and scrub exact milliseconds or choose a key frame. Ground line and ground-anchor overlays are optional. Furniture contact overlay is unavailable because the standalone panel supplies no contact geometry. Review settings stay local to the panel; the system reduced-motion preference remains authoritative over its local override.

Use playback and real-room checks to judge grounding, clipping, interrupted motion, and gaze. Numeric continuity and SVG attachment tests support that review but do not establish visual quality by themselves.

The wardrobe main preview uses the sampled renderer at rest and offers finite Wave, Gentle pats and Hop controls. Pats use the same 1600ms affection as the resident, including its calmer appendage follow-through. The active control becomes its Stop button; other movements wait. Pose selection stops playback. Live reduced motion settles before paint and does not replay when restored. Three 44px-minimum controls share one row, with wrapping labels at narrow sizes. Item grids and outfit thumbnails retain their static renderers, and frame updates stay inside the preview. Previewing never saves pet changes.

Narrow landscape views from 640 to 759px give the wardrobe item panel three wider columns and half the available width. Short item names such as Backpack fit on one line. Compact tabs retain 44px input targets and show every category without horizontal clipping, while the character and pose controls keep their own space.

The creator preview uses a finite 1800ms sampled celebration for species and colour choices. Rapid choices share the original deadline; eye and cheek choices settle immediately so the selected face stays visible. The card stays still, clothing stays equipped, and frame updates stay inside the preview. Live reduced motion cancels the reaction without replaying it when restored. Choices remain a draft until Save.

Explore together offers explicit player invitations to a chosen furnishing. Keep its disclosure and native selector below the scene on phones and beside it in the desktop chores panel, preserving scene size. Reuse the current condition-aware approach and existing orient/action/settle sequence; fractional interruption origins reconnect through known clear segment endpoints. Same-target invitations coalesce. Taps and chore cheers retain priority and cancel pending invitation dialogue. Announce one invited observation at arrival; automatic exploration stays quiet. Reduced motion answers from the current position without beginning a route. Invitations remain local, with no saved pet/chore changes or new animation clock. Repeated furnishings use the builder's numbered names in both the selector and invitation feedback, preserving the selected object ID when counts change.

While Explore together is open and available, mark its selected furnishing with a stationary footprint outline and chevron. Changing or removing the choice updates the marker; collapse, blocked exploration, room changes and unmount clear it. Reuse build selection geometry in preview mode without its floor wash or bobbing animation. Previewing stays decorative: preserve the pet's current position, pose, speech, activity, and clock, with no visit, audio, or saved-data changes. The marker is hidden from assistive technology and never intercepts input.

The resident clock pauses when reduced-motion art is settled or the pet is resting asleep/sick. Finite player reactions/notices keep the same single clock until their deadline; normal-motion suppression completes its existing120ms blend before pausing. Healthy normal-motion residents retain breathing, lifetime blinks and exploration. World/preference changes still validate and paint before display even with no pending frames. Initial sleeping/sick residents start in their resting activity, without blending from an unshown idle frame. Existing Boolean usePetMotion consumers keep their prior scheduling policy; the resident supplies separate normal/reduced activity flags. No new timer, clock or saved preference is introduced.

One native IntersectionObserver pauses that same clock when the resident's SVG is completely outside the viewport or scroll clipping. Any positive visible area keeps it active. Exact edge contact also stays active because the native default threshold may omit the following positive-area notification. Returning into view samples current world deadlines before paint and clears stale hover. Offscreen responses request no frames; returning resumes a finite response only while its deadline remains active. Missing observation support retains the existing clock policy. Observer cleanup ignores queued callbacks; no polling or additional animation clock is used.

Spend time together follows the home chore list and offers Wave, Gentle pats, Happy hop and Stretch together. Each choice uses a finite resident animation, retaining its fractional position and outgoing pose. Busy requests do not queue or extend a reaction; chore cheers keep priority. The resident owns the single successful spoken line, and the controls explain resting/travel without waking or moving the pet. Reduced motion keeps a still pose and returns to zero pending frames when the response ends. Controls remain optional, with no saved changes or separate clock.

Stretch together adds a calm 2400 ms player moment to the same controls and clock. Both arms rise once, hold and lower; small torso extension stays anchored to the feet, with a restrained delayed appendage sway. Bun reaches farther than Mochi and Sprout. Feet, world position and shadow stay grounded, and no reaction marks appear. Busy, resting, travel, chore priority, tap alternation, live reduced motion and offscreen expiry retain the existing rules. The review panel exposes the full timeline through its action selector.

Gentle pats use one slow, delayed appendage sway. Mochi's knot, Bun's ears and Sprout's leaves move at 45%, 55% and 50% of their usual finite-gesture strength, with their existing phase lag and smooth return. This affects only affection appendages; the body, hands, heart, grounded feet, 1600ms duration and other actions retain their geometry and timing. Reduced motion leaves appendages still.

Environmental gaze starts at the actual drawn eye centre, including tired-eye offsets, species/mood torso geometry and facing. Convert the current detail through the inverse torso before bounding local eye travel to the renderer's three-by-two-unit limits. Inspection retains its forward tilt for low details and eases toward a small backward tilt for overhead details, using the existing finite gesture envelope. Keep feet grounded, clothing under the same torso transform and current safe approaches; no contact is implied.

Happy hop uses a separate transient player reaction with play dialogue and the existing1800ms celebration geometry. Chore cheers can preempt it; a hop cannot replace an active response or alter tap alternation/progress. Reduced motion stays still, offscreen expiry samples before return, and all three native choices share the same resident clock. Compact wrapping buttons preserve44px+targets and scene visibility on narrow phones.

When Spend time together is expanded, Show room brings the scene into view and focuses the resident. It preserves the current gesture, dialogue, camera zoom and pan, room selection and saved data. Viewing is available while the pet rests in the focused room. It is disabled during travel or while a blocked route leaves the resident in another room; the control explains how to find them. Use native instant scrolling and the existing pet focus target; successful viewing adds no announcement, timer or animation. Offscreen responses resume only while their original deadline remains active.

Gesture buttons use the width of their own panel, including narrow landscape side panels. In browsers with container queries, use equal one-, two- or four-column rows, with text-relative thresholds so enlarged labels can keep their room. The disclosure and Show room heading may wrap; keyboard order and native targets stay unchanged. Retain the existing flex/phone fallback when container queries are unavailable. Native checks cover the player panel at200%root text; this is not whole-app zoom or assistive-technology certification.
