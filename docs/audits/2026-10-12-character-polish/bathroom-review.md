Approved within the static review scope. No actionable finding in the frozen bathroom gaze changes against base `e58c7fec27b4e804f52f248c9066a13b9c4cbe75`.

Reviewed [interactions.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:29), the added cases in [interactions.test.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.test.ts:151), and [bathroom.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/bathroom.diff). The stored patch exactly matches the current diff of those two files against the base when using its `i/` and `w/` prefixes. Production changes consist solely of three profile entries and their comments. No runtime clock, fixture art, persistence, occupancy, or controller code changes are included.

The coordinate expectations were independently derived from the actual renderers and helpers. All nine match both the profiles and the new assertions. Coordinates below are object-local SVG screen units. Even rotations are 0 and 2; odd rotations are 1 and 3.

| Object and stage | Actual geometry and derivation | Even screen point | Odd screen point |
| --- | --- | --- | --- |
| Shower clean | [Head underside](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/shower.tsx:72), `iso(.62,1,86) + (0,5)`. The underside ellipse uses `head.y + 5`, so the profile's height is 81. | `(-12.16, -55.08)` | `(12.16, -55.08)` |
| Shower messy1 | [Glass water spot](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/shower.tsx:180), `iso(2,.6,56)`. The spot helper uses this point as its ellipse centre. | `(44.8, -14.4)` | `(-44.8, -14.4)` |
| Shower messy2 | [Wiped smiley](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/shower.tsx:209), `iso(2,1.1,66) + (0,-3)`. The specified interior centre lies between its eyes and mouth; the profile's height is 69. | `(28.8, -19.4)` | `(-28.8, -19.4)` |
| Toilet clean | [Tank button top](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/toilet.tsx:25), `iso(.2,.5,38+7)`. | `(-9.6, -33.8)` | `(9.6, -33.8)` |
| Toilet messy1 | [Lid smudge](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/toilet.tsx:92), `iso(.2,.7,38+4)`. The smudge helper preserves its centre. | `(-16, -27.6)` | `(16, -27.6)` |
| Toilet messy2 | [Stained water centre](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/toilet.tsx:39), `iso(.64+.03,.5+.01,18)`. This stage passes `seatDown=false`, keeping `rimZ=18`; water and stain share the centre. | `(5.12, .88)` | `(-5.12, .88)` |
| Washer clean | [Window centre](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/washer.tsx:36), local `(16,-14)` under `onRight(1,1)`. | `(16, 10)` | `(-16, 10)` |
| Washer messy1 | [Blue laundry interior](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/washer.tsx:47), `iso(.5,.5,34) + (-3,1) + .9*(0,-10)`. The [pile helper](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/batch2-parts.tsx:172) translates then scales its blue path. This yields `(0,-18) + (-3,1) + (0,-9)`. | `(-3, -26)` | `(3, -26)` |
| Washer messy2 | [Pink front cloth](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/washer.tsx:70), local `(16,-18)` under `onRight(1,1)`. This point is inside the pink path drawn over the open window. | `(16, 6)` | `(-16, 6)` |

[iso.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/room/iso.ts:17) defines `x=32*(tx-ty)` and `y=16*(tx+ty)-z`. The existing inverse projection subtracts `z/32` from both tile axes, preserving x and raising y by z. For the blue laundry point, `.5-3/64` and `.5+3/64` produce x=-3 without changing the axis sum; height 42 then produces y=-26.

[onRight](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/batch2-parts.tsx:46) applies `translate(iso(w,d,0)) matrix(1,-.5,0,1,0,0)`. At `w=d=1`, a local point `(u,v)` becomes `(u,32+v-u/2)`. This accounts for both window and cloth y coordinates, including the skew.

[PlacedArt](/home/robert/.codex/worktrees/4511/chore-pet/src/room/Room.tsx:84) mirrors the complete object around its origin for odd rotations. Swapping the profile's local tile axes therefore negates screen x and preserves y, including all nested face and pile transforms. Rotations 2 and 3 reuse the corresponding even and odd art; they do not apply additional geometric turns. Room placement also agrees exactly: `OBJECT_SCALE=42.5/64`, so a local point becomes `roomPoint(tileX,tileY) + OBJECT_SCALE*(mirroredX,y)`. At the test and capture origin `(2,2)`, that corner is `(195,172.5)` in Room SVG units. The gaze projection receives the same translation and scale as the drawn detail.

The change preserves the existing behavior contracts. Bounds and free-perimeter filtering remain in [interactionTargets](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:107); selection still rechecks occupancy and uses the existing pathfinder. The new profile data cannot alter the standing tiles. Clean actions remain `inspect`, while all three catalog entries retain `mess: 'stink'`, selecting `smell` for either messy stage. Every emitted target remains `contact: false`.

Signatures still include object ID, catalog ID, position, rotation, stage, and action. [LivingRoom](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:153) regenerates targets when objects, occupancy, or stages change; the [controller](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:283) checks the signature and standing tile. The existing motion sampler projects gaze separately, retains the half-tile standing offset, and compensates for the character's facing. No contact, manipulation, or chore-completion behavior is added.

Read the stored red and green logs. The red log records nine new cases failing at the former x=0 fallback, with 55 other cases passing. The green log records 178 focused passes across interactions, behavior, and activity motion. The added cases cover all nine object/stage combinations, all four rotations, and every returned perimeter target; they assert both screen axes, actions, free standing, and `contact=false`. These are saved execution results, not checks rerun by this reviewer.

Inspected all 18 annotated details in [bathroom-targets.png](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/bathroom-targets.png) and all 18 production Room stills in [bathroom-rooms.png](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/bathroom-rooms.png). Markers track the intended visible details in both mirrors, and sampled residents stand beside the fixtures. Read the capture script and manifest. All 13 recorded source SHA-256 values match the reviewed files. Supporting geometry, fixture, catalog, Room, LivingRoom, behavior, and activity-motion sources are unchanged from the base.

The stills sample real `initialPet`/`step` orientation and action transitions at 42% through the action, starting on the preferred adjacent tile. They cover rotations 0 and 1 and all three species with glasses across the sheet. Species are assigned by stage, so this is not every species at every stage. The stills do not demonstrate approach walking, every fallback standing position, continuous timing, or live LivingRoom integration.

At the time read, the root's stored full-unit log reports 1,929 passes in 86 files; its build log reaches the completed Vite/PWA output with the chunk-size advisory; its resident-browser log reports eight passes and zero failures. The lint log contains the command header without a completion or exit record. This review does not certify root command exit statuses, sequential execution, or final integration completion. Those remain with root. Human temporal playback remains open.

Frozen artifact identity:

- `bathroom.diff`: `5ca5216ac0a80a35c17d227f3a0359190595fe79b378250e56baf50c8991fde3`
- `src/pet/interactions.ts`: `5a96ea1ed13a04d74294b32e7bf4871f03dd6fd9ed1d0412131c0e9f07f20562`
- `src/pet/interactions.test.ts`: `61d05a5dd0f8bd0865744a739eb1bc32b1dabe9639fc737c504b047405388491`

Set aside from this bounded review: human temporal acceptance, root's final heavy-check certification, and the disjoint gallery resource-controls design. Only this review file was written. No tests, builds, browser sessions, capture generation, agents, source edits, or Git mutations were performed.
