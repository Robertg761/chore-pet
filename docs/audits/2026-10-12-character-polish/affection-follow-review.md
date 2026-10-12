Final Batch26 independent review, 2026-10-12. Approved within static/still scope. No actionable critical, important or minor findings.

I applied requesting-code-review to the final eight-path freeze against base `8ec7aa73d54dffcdeb3a38291f9b748608e3d759`. Review comprised source/patch inspection, read-only hash/Git checks, saved evidence inspection and all four PNGs through `view_image`. I ran no tests, builds, browser sessions or agents. This report is the only edit.

All 8/8 source bindings, 1/1 final patch binding and 11/11 artifact bindings match. Reconstructing the patch against its named base reproduces all eight current files. The original six source bindings remain identical; the original freeze and patch are retained. The baseline sampler is byte-exact against the base commit. Both capture JSONs' embedded source/capture bindings match, 14/14 total.

SHA-256 identifiers:

- Final freeze manifest: `41035c76a9a59035e0bcddd7947010f358965a546c4ea824822fce9124b0a88b`
- Final artifact manifest: `d159b7f68f6e3512798f6134775096ff98433ff5ad906ce75640d4547806cbe6`
- Final patch: `41cd31fc1559f6c531ca3fc5fc8d9639e140bb025630db4ec803655ea6affa58`
- Original freeze: `4e1b367394a5f826bedc6987f282227ab96e74e951cefdc84bc76a0610759523`
- Original patch: `90ea397213c911035c62dc98ae9f56f7d9fe217b37efae9e5a2f62f3b4ae6fed`

`src/character/motion.ts:73` and `:354` confine the production change to normal affection appendages. The sine advances one cycle with strengths 45%/55%/50%. At the envelope's 0.1 onset, the common +0.5 radian advance makes all three species' phases positive, avoiding an initial counterstroke while retaining relative lag. The cubic smooth envelope and right-side ratios remain intact. Duration handling, reduced-motion early return, other fields/actions and the original non-affection formula are unchanged. Renderer, controller and clock code have no production changes.

`src/character/motion.affection.test.ts:13` checks both appendages' magnitude, speed and endpoint settling. Its duration cases require one sign reversal, and reduced cases require still appendages. `scripts/browser/pet-affection-follow.test.mjs:53` reads actual local SVG transforms. Mochi's posture subtraction agrees with the knot renderer, Bun's ear wrapper directly carries the sampled angle, and Sprout's 0.4 divisor matches the stem rotation. These cases also check one pending frame, resident position/node identity and saved tables. They exercise one representative rendered appendage per species; the unit cases cover both sampled sides.

The fixture correction at `scripts/browser/pet-play.test.mjs:213` is justified. `src/pet/LivingRoom.tsx:256` advances state at activation time; `src/pet/behaviour.ts:110` snapshots the outgoing motion at that time. Comparing against an older painted frame includes ordinary walking. Six saved trials show frameAt 1536 versus activation 1537–1540 and joins 0.112–0.452. They support this timing diagnosis. Advancing to the next 16ms frame and asserting `before.at === before.frameAt` isolates the intended join; the original 0.5 budget remains at line 225. The diagnostic's current source differs from its preserved original only by removing two unused imports.

Both size sheets contain 18 dressed species/mirror/phase samples, 54 views each at 200/60/25px. I saw smaller appendage deflections without an obvious new clipping, clothing, body, hand or accent defect. The two curve stills show the intended smaller sway and smooth return.

Root-supplied execution evidence reports 254 focused passes, type/build, zero-warning lint, captures and the 40,500-frame differential exiting 0, with 39,510 exact and 990 appendage-only changes. The original native bundle reports 23 passes and one existing pats join failure, 0.66266 versus 0.5. Six diagnostic footers pass, but their process handle was lost; exit metadata remains unavailable/null. Final five native cases reportedly exit 0, covering three SVG-angle cases, corrected pats join 0.0000 and hop. These are supplied execution results, not independently executed or provenance-certified here.

Outside this verdict:

- Full-suite completion/results and execution provenance remain with root's separate run and evidence preparation.
- Human temporal playback and perceived comfort require live observation; stills and numeric samples do not establish them.
- Assistive-technology behavior and physical-device coverage require their own checks.
- CPU and battery effects require measurement; no performance certification is implied.
