Approve with limits. No actionable finding in the frozen batch11 patch.

Reviewed `catalog.diff` against `b832803996c576e0fcaf7afd6ac6e951e8321488`. In-memory reconstruction of all nine patched files from that base matched the current bytes, including both new obstacle files and the capture helper. Review used source/art reads, coordinate derivation, hash comparisons and `view_image` only. Only this report was written. No agents, tests, build, browser or Git mutations were run.

The 15 target points below were independently derived from the actual SVG renderers and their helpers, then compared with [interactions.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:59). Coordinates are object-local SVG units for even rotations.

| Object | Clean | Messy1 | Messy2 |
| --- | --- | --- | --- |
| Dishwasher | Blue control, `21.12,-2.65` | Upper counter plate, `3.7,-29.5` | Tilted rack plate, `23.92,10.21` |
| Dining table | Pink flower centre, `-5,-31` | First setting plate, `-16.64,-17.32` | Top stack plate, `0,-3.5` |
| Coffee table | Wood centre, `0,-2` | First plate, `14.4,-5.4` | Top stack plate, `0,-21.8` |
| Trash | Lid handle centre, `0,-13.25` | Exposed bag centre, `1,-15` | Blue overflow bag centre, `6,-17` |
| Recycling | Front badge centre, `0,11.72` | Same retained badge | Same retained badge |

Derivation uses `iso(a,b,z) = [32(a-b),16(a+b)-z]`. Dishwasher `rightFace(34)(.34,6/34+.115)` gives the clean control; its counter stack uses `iso(.55,.45,34)+[.5,-11.5]`. The open rack centre is `iso(1+.55*.45,.12+.5*.76,3+.55*5)`, with its upper plate 12 units above it. Rotation around that plate's own centre leaves the centre unchanged. Dining targets use `iso(1,1,40)+[-5,-9-14]`, `iso(.48,1,40)+[0,-1]` and `iso(1.5,1.5,40)+[0,-11.5]`. Coffee-table targets use height 34, with plate offsets -1 and -15. Trash has floor centre y16 and rim y-12; its handle centre is `-12-3+3.5/2`, and bag offsets are `[1,-3]` and `[6,-5]` from the rim. Recycling uses `iso(.71,.71,11)`.

Room art mirrors screen x for odd rotations. The gaze helper swaps tile axes before the height lift, giving exactly `[-x,y]` for rotations 1/3 and `[x,y]` for 0/2. Every returned approach shares that gaze independently of its standing tile. The new point tests inspect every returned approach across all four rotations and three stages. Clean actions are inspect; dirty dining/coffee tables use dust and dirty dishwasher/trash/recycling use smell. All remain contact=false. The point-test room fixture uses placement footprints; stage-aware clearance is checked separately by the obstacle and resident integration cases.

[petObstacles](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/obstacles.ts:6) correctly reserves the open door. Actual door art spans local tx1 through 1.45 and ty.12 through .88. Expanding only messy2 dishwasher width to 1.45, or depth for odd rotations, therefore blocks the whole adjacent front standing tile under the existing overlap rule. It preserves the other visible side and back approaches. An isolated 1x1 fixture has four perimeter approaches when closed and three when open; each 2x2 table has eight. Owned stage lookup prevents inherited values from opening the door. All other solid footprints, flat/hung behavior and placement rules remain unchanged. [LivingRoom](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:137) shares these obstacles across its default spawn selection, walking and interaction-free predicate. Explicit initial positions still enter through the existing behavior validation.

The exact-footprint tests cover all four rotations, front blocking, side freedom, closed stages, owned reserved keys, other catalog entries and non-mutation. The two [resident regressions](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetIntegration.test.tsx:351) sample positions every 50ms, reject entry into the open front tile, observe a bubble during the run, then require front entry after clean restoration. Saved evidence distinguishes the initial two clearance failures from the subsequent two expired-bubble assertions. The corrected fixture accumulates bubble observation through the run. `catalog-focused-final.log` records 242 passing tests across five files. This is root-run evidence read during review, not an independent rerun. Full-suite/build/browser results are outside this review's execution scope.

Ten new neutral lines complete exactly 24 catalog/decor keys, with two distinct observations per entry. The calm helper's owned-key/unknown fallback and the caller's mood fallback remain covered, including the new forced-empty helper case. Condition selection, held interaction seed, player dialogue priority and ambient aria-live silence retain their existing branches. Artwork, placement geometry, behavior and motion helpers match the base bytes.

Inspected all 30 final annotated details and all 30 final Room stills at original resolution, plus the preserved before-clearance room sheet. Final markers match the visible features in both mirror orientations. Both corrected open-dishwasher stills place sprout on the other visible side, leaving the folded door and rack exposed. The manifest confirms standing tiles `2,3` for rotation 0 and `3,2` for rotation 1 at object origin `2,2`; preserved captures used the blocked front tiles instead. All 18 final source-manifest hashes match current bytes. All 17 preserved source hashes also match after mapping the original helper entry to `capture-catalog-before-clearance.mjs`.

Approval covers this resident-room correction and these static captures. Stills sample the preferred available approach at 42% of the action for rotations 0/1, with mochi clean, bun messy1 and sprout messy2, all wearing glasses. They do not visually cover every approach/species combination or establish transition quality. Rotations 2/3 and other approaches receive static code/test review only. Human temporal acceptance remains open. `findHomePath` and `useHomePet` still build solids from placement footprints without stages; multi-room routes, fallback positions and travel handoff clearance require the planned following batch. No global travel-coverage claim is made.

SHA-256 values for the reviewed evidence in `docs/audits/2026-10-12-character-polish`:

| File | SHA-256 |
| --- | --- |
| `catalog.diff` | `4e73ff2c8b0026912288b3bb38bf27f1b8ae389f1fed090b5f64b983f8ee0f2b` |
| `catalog-targets.png` | `a430ee285f2f6c0e3a6bef774f00893ce73c4eb3f13e010c53f663d32c7f5529` |
| `catalog-rooms.png` | `a1e93c4c1cfe1d7b1963702de3c819327730f9a441100a619896f2a105d60057` |
| `catalog-captures.json` | `8db4aab1f65c80bd6758088a0add77c1ac77ad1e815e04f9ebb9c18b484ce5a4` |
| `capture-catalog.mjs` | `f92fd0241c49fd5f970869560637fb045bea83dcfa329c8b9f75d44dde1fe60e` |
| `catalog-rooms-before-clearance.png` | `110e82d864f779092f272b8eb3d34fb8535675dd9a533587f45389cc67461b9b` |
| `catalog-captures-before-clearance.json` | `7ea307ddac02fcf57e5de00ab8f566c88a7eaa96c75d6a899d0c4d7066cd71b0` |
| `capture-catalog-before-clearance.mjs` | `831166978e80fe3f3645c83923543cbdb8cafa663050c59ec8fb532f85593f54` |
| `catalog-clearance-red.log` | `42175ee1542266f08a29ecddcd4d5d7a1d97947872e6dfe09b3b5eadd1deb336` |
| `catalog-clearance-green.log` | `3700258dd604c36aed31bcb028d899171e26b30161e98c5b93a5debcb6265fb7` |
| `catalog-focused-final.log` | `c49f2bcd46d4bdf86c32769670c20639030ccea142a994f4ba56cb9c39c5e2e0` |

Key source hashes: `src/pet/obstacles.ts` = `88b74b0d6816f01bbac28e13da3f8641e84d7969a164b4d84132d0f7ec42b62c`; `src/pet/interactions.ts` = `39b14d894763531a1cc058f65ddac70bb0118c818bd6ede82c1143fe02e059f7`; `src/pet/LivingRoom.tsx` = `707fe6166844a57ab585162620c9914516cb29a9f499ce5c94cc4f5fd3bb765b`.
