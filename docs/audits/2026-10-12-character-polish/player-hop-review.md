# Batch21 Happy hop review

Approved for the frozen Batch21 static/still scope. No Critical, Important, or Minor findings; no required corrections. This verdict covers the 13 files and patch bound below. Root retains responsibility for execution acceptance and subsequent work.

Reviewed on 2026-10-12 under the requesting-code-review skill and its reviewer template. This reviewer spawned no agents. This review used source reads, read-only Git comparisons, SHA-256 checks, and `view_image` for all six supplied PNGs. Only this report was written.

The checkout HEAD was `8574288956963d78072df97ca93aa5d1da2d63b3`. The feature is the frozen working-tree diff against that commit. All 13 live source hashes match both manifests; the embedded freeze equals the standalone freeze. The scoped live Git diff equals `player-hop-source.diff` byte for byte. All seven listed artifacts and seven logs match their declared hashes.

The implementation keeps the player reaction separate from chore priority and reuses the existing motion and clock paths. The controls retain native button semantics and readable wrapping in the supplied layouts.

| Requirement | Static evidence and assessment |
| --- | --- |
| Separate player hop, priority 0 | [behaviour.ts:11](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:11) includes `hop` in `PlayerGesture` and `ReactionAction`. [behaviour.ts:429](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:429) gives only `celebrate` and `celebrate-big` priorities 1 and 2. Both can preempt hop; hop cannot preempt either or an active player response. The two chore kinds are covered in [behaviour.test.ts:498](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.test.ts:498). |
| Existing 1800 ms sampler in direct and snapshot paths | [behaviour.ts:443](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:443) maps only the duration lookup to `ACTION_MS.celebrate`, leaving the semantic action `hop`. [activityMotion.ts:59](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:59) maps sampler input to `celebrate`. Both `motionFor` at line 172 and `snapshotFrame` at line 134 call that same `inputFor`; retained outgoing layers therefore receive the mapping too. [motion.ts:58](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:58) retains 1800 ms, and [motion.ts:276](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:276) retains the existing lift/recovery geometry. The three-species sampling assertions are in [activityMotion.test.ts:667](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.test.ts:667). |
| Explicit busy, rest and travel guards; one response, no player-choice queue | [LivingRoom.tsx:251](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:251) rejects away/sick input before a response and active reactions before sound, speech or deadline changes. [PetPlay.tsx:23](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetPlay.tsx:23) checks `blocked`, and all three buttons use native `disabled`. The unchanged [App.tsx:996](/home/robert/.codex/worktrees/4511/chore-pet/src/App.tsx:996) checks travel and resident-room identity both for UI blocking and callback dispatch. Repeated chosen hops neither restart nor queue. The existing direct-tap coalescing policy remains separate. |
| Tap alternation and fractional route safety | [behaviour.ts:441](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:441) increments `reactions` only for `tap`; hop clears its own pending flag. Existing `change` snapshots preserve outgoing pose, `freeze` preserves the exact route position and segment, and `reconnect` selects a known clear endpoint, at [behaviour.ts:102](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:102), [behaviour.ts:227](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:227), and [behaviour.ts:242](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:242). `respond` advances world validation before freezing. Reaction expiry uses the same reconnection at line 391. The corrected endpoint 3 in [behaviour.test.ts:505](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.test.ts:505) matches that existing one-segment reconnection; endpoint 4 would incorrectly require resuming the discarded original route. |
| Invitation cancellation and speech ownership | Accepted choices clear `invitation.current` before advancing at [LivingRoom.tsx:256](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:256). Hop uses the typed `PLAYER_LINES` table at line 74 and one successful `said` update at line 261. The resident's polite live region at [LivingRoom.tsx:405](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:405) owns that line; [PetPlay.tsx:39](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetPlay.tsx:39) supplies only busy/rest/unavailable status. Chore preemption cancels invitations and owns its completion dialogue through the existing effect at line 301. |
| Offscreen zero frames; finite reduced clock | [LivingRoom.tsx:106](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:106) gates the existing clock on visibility and finite deadlines. Its layout effect at line 128 samples current state on visibility/preference changes before paint. [usePetMotion.ts:44](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts:44) retains one pending rAF, hidden-document cancellation and disposal checks. [usePetVisibility.ts:4](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.ts:4) retains native intersection observation, cleanup and the unsupported-observer fallback. Reduced sampler geometry returns still at [motion.ts:194](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:194), bypassing outgoing blending at [activityMotion.ts:175](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:175). Hop-specific reduced/offscreen assertions are at [PetIntegration.test.tsx:1055](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetIntegration.test.tsx:1055). Healthy visible normal idle intentionally retains its original clock. |
| No saved mutation, new timer or art/sampler change | The new choice routes to local resident state. The unchanged position callback reaches a ref in [useHomePet.ts:23](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/useHomePet.ts:23), without a store write. No production timer or scheduler is added by the patch. The existing speech timeout at [LivingRoom.tsx:293](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:293) is reused. The character directory and clock modules have no diff against HEAD; the existing renderer continues to pass `equipped` through the same body layers at [LivingRoom.tsx:135](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:135) and [AnimatedCharacter.tsx:11](/home/robert/.codex/worktrees/4511/chore-pet/src/character/AnimatedCharacter.tsx:11). Supplied native assertions compare saved tables after choices and normal hop. |
| Three play lines without a reward claim | [petLines.ts:208](/home/robert/.codex/worktrees/4511/chore-pet/src/content/petLines.ts:208) contains exactly `Hop, hop!`, `A little hop for you.`, and `Ta-da! That was fun.` They claim no chore completion or reward. The content test includes hop in the general line checks and checks reward vocabulary at [petLines.test.ts:349](/home/robert/.codex/worktrees/4511/chore-pet/src/content/petLines.test.ts:349). |
| Compact third native button, targets, focus and wrapping | [PetPlay.tsx:35](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetPlay.tsx:35) adds a native `type="button"` with the existing disabled/note semantics. [PetPlay.css:6](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetPlay.css:6) keeps wrapping flex layout, 10 px gaps and 48 px minimum action height; [controls.css:19](/home/robert/.codex/worktrees/4511/chore-pet/src/shell/controls.css:19) retains 44 px minimum width and the focus outline. The supplied browser source checks all four targets, keyboard order, hop outline clearance, horizontal fit and unchanged room height at [pet-play.test.mjs:52](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-play.test.mjs:52). All six stills were inspected as described below. |

Surrounding files compared byte for byte to HEAD and found unchanged: `src/App.tsx`, the entire `src/character` Git diff, `src/pet/usePetMotion.ts`, `src/pet/usePetVisibility.ts`, `src/pet/useHomePet.ts`, `src/pet/HomeTraveler.tsx`, `src/pet/homeTravel.ts`, `src/pet/pathfinding.ts`, `src/shell/controls.css`, `src/room/HomeScene.tsx`, `src/room/HomeScene.css`, `scripts/browser/pet-offscreen-clock.test.mjs`, and `scripts/browser/helpers.mjs`. This comparison supports the surrounding invariants; it is not a review approval for unrelated modules or later changes.

All six PNGs were opened through `view_image`. At 320 px, Gentle pats and Happy hop wrap to two readable lines; at 390 and 1280 px, all three labels fit on one line. At 640 px, Happy hop wraps onto its own full-width row; at 844 px, the longer labels wrap within the single button row. The focused hop outline is visible and clear in each reduced-motion layout. The 390 px normal peak still shows the raised character and changed ground shadow. The phone views crop part of the environment above the viewport while the character body remains visible. No still shows a body clipping defect. The numeric 95% body-area criterion comes from the supplied browser assertion at [pet-play.test.mjs:31](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-play.test.mjs:31), rather than a new measurement in this review.

Exact verified bindings follow. SHA-256 values are for the bytes read during this review. Artifact/log names below are relative to `/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/`.

| Metadata or patch | SHA-256 |
| --- | --- |
| `player-hop-freeze.json`, observed metadata digest | `63e3e203a9ea6647f98d30210eb363d346ca59244f2e5a6a587018c6c16c4d60` |
| `player-hop-verification.json`, observed metadata digest | `b4bdf990e50ef5d0cdafc8d843fc3c130fd36e6b69a65537013df4648b8fab4f` |
| `player-hop-source.diff`, declared digest and exact scoped live diff | `c9a6125fc05e82f5ada5ddbbc0ddfd8733c9c71b6e091ca03644d4e14fe67754` |

| Frozen source, relative to the worktree | Verified SHA-256 |
| --- | --- |
| `src/pet/behaviour.ts` | `c4e9efb89c93e6cddac05552000587ced2bd668489d11031bfd30b62f2f06303` |
| `src/pet/activityMotion.ts` | `eaf7a7f3c73a8e06209a05fb4c52fde4819c0792d543613665aaa5c044faf314` |
| `src/pet/LivingRoom.tsx` | `166583cc175634143fcf9ae93e6fc6fa30e763168964b754deeb7c622ee5f1bf` |
| `src/pet/PetPlay.tsx` | `d8f61e25c3b0ba368b72140163d7f3192952dee922b5694d4dc09d8e41312379` |
| `src/pet/PetPlay.css` | `fa3945fd3187d64dcd675634360813475c0eacb8eb1eb60e754a0f7cc3bbc630` |
| `src/content/petLines.ts` | `1579d054d8f975527eeaef079d2427cebcb96ac2d0529b7cdc2fbe9acd53e61f` |
| `src/pet/behaviour.test.ts` | `a9ed0de69da4f122380b4408d08e8b27794c9d37ec5c91927a6a081e84a838f8` |
| `src/pet/activityMotion.test.ts` | `1efdab93c7bc2909a03a806cd4390d2c69ddfe57cdb459bf92aad32ecc4797ab` |
| `src/pet/PetIntegration.test.tsx` | `b2632a6de22599aec596130b207b3543cf5441f41cf7c36310485d77576be52d` |
| `src/pet/PetPlay.test.tsx` | `bd93163b22f9170b9baaff2329cd00f410e023b1a3a585c022e87c7e7aed23d1` |
| `src/content/petLines.test.ts` | `83a34cdeed390327e7bd7eb19ea0bb2f370789dddc111580848cc1b66b13ad06` |
| `scripts/browser/pet-play.test.mjs` | `4e4cf81a14c08786a3bc27f5638b55152d4ac8132639e93f82f7c2041f62418a` |
| `docs/ART.md` | `29e88a5df98c2595b7f8fe45e6318224772902e62a5e85ad90052efe0534dd0f` |

| Supplied artifact | Verified SHA-256 |
| --- | --- |
| `player-hop-browser-red-fixture.mjs` | `d46eb979a32f4a02a1d46c3b740d170c41ebfd7af4d7134ef455ec88706beb76` |
| `player-hop-layout/hop-peak-390.png` | `4dd241a16772351ae458fcc5949af82ff212dc4155defb7d9825b0c4382fc237` |
| `player-hop-layout/play-1280.png` | `692c36de4c80f41e3b43a76d1f853fef37efe32ab899e6b4572c5035b18ef481` |
| `player-hop-layout/play-320.png` | `54bc3ed34ab405250432fcd3feadd4127f0cf13db9db6a4b2c7560fca3f8fad8` |
| `player-hop-layout/play-390.png` | `3bf2082c44174a8b9eb94f6a57e6e2e114ca397cd9296d4aff95f7f3419c5dd6` |
| `player-hop-layout/play-640.png` | `ade1f97d7555cb18ebcca4066710e799019119395e0fe55b4265ef8b938b74bb` |
| `player-hop-layout/play-844.png` | `ce9275cceba1b12c2f432530e940dfb8e705c5064dd97d27d1675bfcbbf563eb` |

| Supplied log | Verified SHA-256 |
| --- | --- |
| `player-hop-browser-red.log` | `8305d29aa2c4a87781b8b4115a3c1bc0a824b339190c8feb1c6418e57716545b` |
| `player-hop-red.log` | `b8a47eca0eda391388bac9ff49435c06488f7fe41e922c1e20eaeb21b34d088c` |
| `player-hop-focused.log` | `7aea1c8c07e2b09d107627cd8c7f6ae07520d73e179f721c0c251031a3725611` |
| `player-hop-build.log` | `8f50ddaa44e5c805d8a880e3b99aa7ffde330db45f3aae0f51dd274b0f2b0617` |
| `player-hop-lint.log` | `857d0b72320525e19e457cae16f3e92811847f8f54e642083ff0962bcc5e8a68` |
| `player-hop-browser.log` | `c34bc6d66751ca933476b200acf30e36624a375c98169cae5c7754f753a0527f` |
| `player-hop-full.log` | `8b3bfa2b1eb5baf6f4b3e490edc9e34ac7a4915a0f6876a9d2c24784aa425b7b` |

The supplied focused log records 255 tests in five files. Its manifest explicitly says it predates only three added hop guard assertions in an existing test, now at `PetIntegration.test.tsx:1023`, `:1027`, and `:1030`. The supplied build log records `tsc -b && vite build` and includes a bundle-size warning; the zero-warning claim belongs to lint. The supplied native log records 12 cases: five reduced layouts, room reset, fractional affection join, normal hop, and four existing native offscreen/observer cases. Those four platform cases use the unchanged offscreen test module; the hop-specific offscreen expiry assertion is in the integration test.

The request described the full run as pending. The manifest and full log read for this review now record 2125 tests in 98 files and 62.61 seconds. The manifest attributes final build, lint, browser and full evidence to the final 13 sources. I verified the supplied bytes and their declared hash bindings; I did not witness, rerun or certify any root command exit, historical source-to-execution binding, or production bundle provenance. Root's final executions remain its responsibility.

The old red log records 18 failures and 237 passes. One failure is the wrong route expectation 4 versus the existing endpoint 3. It is corrected in the frozen source, so the old total is not 18 independent product failures. The browser-red artifact records the absent Happy hop choice before implementation. Its copied fixture contains an absolute local helper import and is historical evidence, not a reusable production test.

Behaviors considered and set aside, with reasons:

- Full environment/scene visibility on phones. The requested acceptance scope is character-body visibility of at least 95% with scene size preserved; partial environment scrolling is explicitly allowed. The stills and assertion source were assessed against that scope.
- New animation design, art changes and subsequent work outside the 13 frozen files. Those changes are outside Batch21; this approval does not extend to them.
- Human temporal quality, assistive-technology playback, physical-device behavior and CPU/battery performance. Static source and stills cannot establish these. The normal peak is one 390 px capture; the other five layouts use reduced motion. The supplied sampled geometry/frame assertions support motion behavior without constituting human temporal acceptance. Outfits, moods, fonts and zoom levels are not exhaustively represented.

No tests, build, lint, browser, capture, network request, agent dispatch, Git mutation or product edit was performed in this review. Required corrections remain none within the verified static/still scope.
