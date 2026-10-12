Batch17 independent static review, 2026-10-12. Changes requested. One P2 finding blocks approval of this exact freeze; no P0 or P1 findings.

- **[P2] Give the new player controls a distinct sibling key.** [src/App.tsx:996](/home/robert/.codex/worktrees/4511/chore-pet/src/App.tsx:996) assigns `PetPlay` the same `${home.id}:${room.id}` key as its `PetExplore` sibling at line 985. Start in a furnished room A and focus room B without leaving Home. Both old children share key A, and both new keys change to B. React's keyed fallback map retains the later `PetPlay` entry and overwrites the earlier `PetExplore` entry, so the old Explore child is absent from the deletion pass. Its DOM can remain beside the new room's controls, retaining the previous room's furnishing choices and callback. Removing the last furnishing while Home stays mounted reaches the same collision when Explore becomes absent. This is a stale-control and duplicate-disclosure bug, beyond the development duplicate-key warning. The static trace was checked against the installed production reconciler's `mapRemainingChildren` and `reconcileChildrenArray`, and its development counterpart. Give `PetPlay` a separate key such as `play:${home.id}:${room.id}`. Add regression coverage for furnished A to furnished B and furnished to empty, checking exactly one current Explore disclosure where applicable, no old furnishing choices, and one player-time disclosure. No runtime reproduction was run in this review.

The remaining inspected paths support the intended behavior. Explicit `greet` and `affection` use the existing 1200ms and 1600ms deadlines. `respond` advances the current world state before capturing the outgoing pose and fractional position; `react` keeps the existing transition and safe reconnection inputs. An active reaction returns `busy` before invitation cancellation, audio, or speech replacement, so rapid choices neither extend its deadline nor queue a choice. Chore celebrations retain higher reaction priority and their speech survives a rejected choice. Accepted choices cancel a pending invited observation and use the resident's single polite live region; `PetPlay` adds no successful status text.

The App callback checks both travel and resident-room identity, and the imperative handle reads current props on each commit. Resting choices are disabled in the controls and declined by the resident. The sibling-key finding above compromises room-control cleanup despite those guards. The shared motion hook cancels pending frames while hidden and on cleanup, resumes against elapsed monotonic time, and keeps reduced motion active only for a finite reaction. Reduced sampling removes displacement, and the existing world/preference layout effect still validates state before paint. The new controls create no clock, saved operation, or independent motion lifecycle.

The disclosure and choices are native buttons with explicit types, native disabled behavior, `aria-expanded`, `aria-controls`, a labelled group, and descriptions for blocked states. The hidden panel explicitly uses `display: none`. Existing shared focus styles and 44px minimum control sizes apply; the action buttons have a 48px minimum height and wrapping layout. The added tests were read as source, including their keyboard, rapid-input, pose/position, reduced-motion, priority, and saved-table assertions. Their results are not certified here. The new App test covers an initially empty room, but does not exercise the room/furnishing transitions in the finding.

All five PNGs were opened individually with `view_image`. Their still-frame observations are:

| Capture | Dimensions | Observation |
| --- | --- | --- |
| `play-320.png` | 320 x 640 | Resident remains visible in the scrolled scene. Both actions fit; Gentle pats wraps to two lines. Its focus outline clears the bottom navigation. The upper room is cropped by the current scroll position. |
| `play-390.png` | 390 x 664 | Room and resident remain visible above the chores and expanded controls. Both action labels fit on one line; the focused outline clears the bottom navigation. |
| `play-640.png` | 640 x 360 | Landscape rail and two columns fit. Actions stack vertically, the resident is visible, and the successful speech bubble is readable. |
| `play-844.png` | 844 x 390 | Landscape columns retain a visible resident and readable speech. Actions share a row with Gentle pats wrapping; the focused outline stays inside the panel. |
| `play-1280.png` | 1280 x 800 | Large room and resident remain visible beside the scrolled chore list and expanded controls. Both actions and the speech bubble are readable; the focus outline is visible. |

No additional actionable clipping, label, or focus-outline defect appears in these sampled stills. The mobile captures are scrolled to the controls and do not show the speech bubble. These images establish only their captured states and sizes.

The reviewed change scope is exactly the 13 files in `player-choice-freeze.json`, against base `96df2f3f0f06ab8b24cc6f69cdcdcf2a7c375b71`. Every source, patch, and capture SHA-256 matched the manifest. Each patch hunk's old content was checked against that base, and applying its text in memory reconstructed each frozen current file exactly. The patch names exactly the manifest's 13 source files, with no additional file sections.

| Review input | SHA-256 |
| --- | --- |
| `docs/audits/2026-10-12-character-polish/player-choice-freeze.json` | `7fb9b93f495e514f8c60ba2862ce0489eaf6a5fa7d426ba79c00865e56dc77da` |
| `docs/audits/2026-10-12-character-polish/player-choice-source.diff` | `d140b7231fae658e2f58d0026d62f9d7501835d0559e33b9158315aeb9f62a51` |

| Frozen source | SHA-256 |
| --- | --- |
| `src/App.tsx` | `5bfdc3733a1eaf55e9ba699e3c61d370ac37fbb8d46d36090a6eab2014d99eaa` |
| `src/App.navigation.test.tsx` | `5edd66426310fe8f24b597c5a84aba42ff0970d3a592ee66d1be157f3956fd2a` |
| `src/content/petLines.ts` | `7ee56cb2e7d26be2caf438d4ce42b232b77450f4b878f18f8cffd61bc52f31cc` |
| `src/content/petLines.test.ts` | `b2bf42518e2b56297bd19d71e0e45fbd82592ddccb7dfc3b8c84c10b08fdf605` |
| `src/pet/LivingRoom.tsx` | `1bd1a91d633324e7d7e5e8403869de14f3714e1f313a52ab9e6381c977eb9850` |
| `src/pet/PetIntegration.test.tsx` | `4a58225a8a6fa96e16b84c7463c83971270e42c74aa8f763148b2232ba6c8f1a` |
| `src/pet/behaviour.ts` | `c9eafc68f5c898f4a68573c2a44169ea7a54c01a27f8ec83a3852e435a5fed4f` |
| `docs/ART.md` | `7c0de6ea1235ca82b8fa9b8ff9d31bd4126d5dc3b40807b44514b1e6a93a4613` |
| `src/pet/PetPlay.tsx` | `8d7bc1ea01a9db27652f431283102776bb277e817555f48dfc071b38923a9275` |
| `src/pet/PetPlay.css` | `70c2f887a192ced26c237f9bc9d7f1f5263594c0104a1544f69a78b8e7648bf1` |
| `src/pet/PetPlay.test.tsx` | `db7835b372e66ba2a0f3f1ab036fced7d37163ca7934decfa8d5f11d84a98540` |
| `src/pet/playerChoices.test.ts` | `acc313a7c907fb4bfe9f21f7a8bd93ccd920aa3937f9b190495a20d5d6ac0bd2` |
| `scripts/browser/pet-play.test.mjs` | `2976d676f10cf4b55567685ba4f71308336123409f8a3f4e7079ec2faa4e186b` |

Capture paths below are relative to `docs/audits/2026-10-12-character-polish/player-choice-captures/`.

| Frozen capture | SHA-256 |
| --- | --- |
| `play-1280.png` | `8e342be3821c9845a2308075ea4c3e1e029d5a1506bc95dd496b1b84eb5b4429` |
| `play-320.png` | `c8bab88e02029751936b384945631854f40faf962182f72787b003044590b62a` |
| `play-390.png` | `43fd1f4b5a08714b3f12178025880ac9c3736b06e62eb323c69512efaefab6f8` |
| `play-640.png` | `ac6a896642ccd244734f9f27160ca4e6fdf3d1212f5f2184481d7bc9633c259c` |
| `play-844.png` | `8608e58e8781405fcc175194914a617d411c8d9b761a4c1b539a5e8a5c92a66c` |

Read-only supporting context comprised root `CLAUDE.md`, `docs/SPEC.md`, `docs/PLAN.md`, the surrounding frozen source, `src/pet/activityMotion.ts`, `src/pet/usePetMotion.ts`, `src/pet/useHomePet.ts`, `src/pet/PetExplore.tsx`, `src/character/motion.ts`, `src/room/HomeScene.tsx`, `src/room/HomeScene.css`, `src/index.css`, `src/shell/controls.css`, and the relevant child-reconciliation sections of installed `react-dom` production/development code. No applicable `AGENTS.md` was found in the checked ancestors or affected directories. The user's bounded static-review instructions take precedence over the root guide's routine build, test, delegation, and commit workflow.

Considered and left outside this review's judgment:

- Root single-worker check exits, build, lint, unit/browser execution, and runtime reproduction. None were run or certified by this reviewer; the root owns that verification separately.
- Temporal visual quality, including motion handoffs and recovery across all species, outfits, moods, interruption times, hidden intervals, and preference changes. Static traces and stills cannot establish playback quality.
- Assistive technology announcement timing, actual speech deduplication, cross-browser native keyboard behavior, physical-device behavior, zoom/font expansion, and viewports or states absent from the supplied captures. These still require their respective runtime checks.
- Unrelated repository changes and new gameplay/design directions. This review covers the frozen player-choice feature and its integration; no further design approval gate is requested.

Only this review document was written. Product files, tests, captures, the patch, the manifest, and Git state were not modified by the reviewer. Approval remains withheld for the P2 sibling-key defect; the remaining static review produced no further actionable findings.

Amendment, 2026-10-12. Approved for the revised static and still-image scope. The original P2 finding is closed for the final bindings below, with no remaining actionable findings. This verdict supersedes the original withheld approval for this revision only; the original finding, reasoning, scope, and hashes above remain historical evidence.

The revised `PetPlay` key at [src/App.tsx:996](/home/robert/.codex/worktrees/4511/chore-pet/src/App.tsx:996) is `play:${home.id}:${room.id}`, distinct from the sibling Explore key. On a room switch, the old children now occupy separate keyed-map entries and both can be deleted correctly. When the last furnishing disappears without unmounting Home, Explore's entry remains available for deletion while Play retains its own identity. No reaction, travel guard, speech, or motion-clock implementation changed in this correction.

The added source regressions address the reported triggers:

- [src/App.navigation.test.tsx:129](/home/robert/.codex/worktrees/4511/chore-pet/src/App.navigation.test.tsx:129) switches through the rendered room selector for furnished-to-furnished and furnished-to-empty cases. It checks the Explore and Play counts, the reset Play disclosure, and, for the furnished destination, exactly its new object option and a reset Explore disclosure.
- [src/App.navigation.test.tsx:158](/home/robert/.codex/worktrees/4511/chore-pet/src/App.navigation.test.tsx:158) removes the final furnishings through a fixture update and rerenders the same mounted App. It checks zero Explore disclosures and one Play disclosure.
- [scripts/browser/pet-play.test.mjs:126](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-play.test.mjs:126) adds furnished and empty destination fixtures, reloads, then selects them through the native `Focused room` selector. It checks disclosure counts, reset state, and the exact destination furnishing option. The selector's `/^Focused room/` label locator matches the actual RoomControls label, and the existing browser helper serves the production artifact. These are source-level observations, not independently executed results.

The implementer reports that the three App cases reproduced the defect before the fix, and that the corrected native production test observed two Explore controls instead of one before the fix. The initial browser label-locator timeout was preserved separately and is not treated as a reproduction of the key defect. The reported final 137 focused passes and seven browser passes, 11.7899s and exit 0, remain root-owned reports. This reviewer did not run those checks, inspect their exit logs, or certify build/lint/browser/unit results.

The final regenerated `play-1280.png` was opened again with `view_image` after the final manifest binding was supplied. At 1280 x 800, the room, resident, speech bubble, Wave/Gentle pats labels, and focused Gentle pats outline remain readable and contained. No new clipping or control-visibility finding appears. Its bytes differ from the historical image. The 320, 390, 640, and 844 PNGs were verified byte-identical to their originally inspected versions, so their individual inspections above carry forward. The premature claim that all five were identical is not used as evidence. All five final PNG hashes match the final manifest.

The final scope remains exactly the original 13 source paths against base `96df2f3f0f06ab8b24cc6f69cdcdcf2a7c375b71`. Both the preserved initial patch and revised patch were reconstructed in memory against that base. Their file sets match the manifests exactly. The revised patch reconstructs the current 13 files exactly, and the initial reconstruction matches the original 13 source hashes. Only the following three source hashes differ from the original review; the other ten source hashes above were rechecked and are unchanged.

| Revised source | Final SHA-256 |
| --- | --- |
| `src/App.tsx` | `28f584a15d7438e04f4164cdf9d1d3e6515e1fc423d3d0015d1bd105123387f0` |
| `src/App.navigation.test.tsx` | `dc4e1b4961ad37755e67cb810429c2b79ec2c0daae51a798cb861639165bd5cc` |
| `scripts/browser/pet-play.test.mjs` | `f5bbeb4105d4ac71da49df7142ed7db432eaf15ed9b0a6d2f7cd9cf336aa6f99` |

| Final review input | SHA-256 |
| --- | --- |
| `docs/audits/2026-10-12-character-polish/player-choice-freeze.json` | `cb612f3a50bc14607e07b12ac1415fc4ab002e63b3bd24db6aee1c0e9e2a4c16` |
| `docs/audits/2026-10-12-character-polish/player-choice-source.diff` | `e519aa00b23ab48ba45465833bb7d94cb2fe4ac0d11c648b92321d4780f4638d` |

Final capture paths remain relative to `docs/audits/2026-10-12-character-polish/player-choice-captures/`.

| Final capture | SHA-256 |
| --- | --- |
| `play-1280.png` | `bdfb6d9561f69a7576a8f630aa40039ba73ad8dbcc2d6c8550c9a5ea4c98536e` |
| `play-320.png` | `c8bab88e02029751936b384945631854f40faf962182f72787b003044590b62a` |
| `play-390.png` | `43fd1f4b5a08714b3f12178025880ac9c3736b06e62eb323c69512efaefab6f8` |
| `play-640.png` | `ac6a896642ccd244734f9f27160ca4e6fdf3d1212f5f2184481d7bc9633c259c` |
| `play-844.png` | `8608e58e8781405fcc175194914a617d411c8d9b761a4c1b539a5e8a5c92a66c` |

The preserved `player-choice-freeze-initial.json` has SHA-256 `7fb9b93f495e514f8c60ba2862ce0489eaf6a5fa7d426ba79c00865e56dc77da`; `player-choice-source-initial.diff` has SHA-256 `d140b7231fae658e2f58d0026d62f9d7501835d0559e33b9158315aeb9f62a51`. They match the original reviewed manifest and patch exactly. The original 1280 hash above remains the historical binding and is not the final image hash.

All original static/still limits remain. Temporal motion quality, assistive technology playback, cross-browser and physical-device behavior, unrepresented sizes/states, and root-owned check exits are outside this approval. The next-batch pointer-attention draft, log, and browser file were excluded and not reviewed. Additional supporting reads for this amendment were limited to the rendered RoomControls selector and the relevant browser-helper setup. Only this review file was appended; product/tests, captures, manifests, patches, and Git state were not changed by this reviewer.
