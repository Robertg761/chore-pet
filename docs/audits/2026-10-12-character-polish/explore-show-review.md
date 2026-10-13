# Batch41 Explore Show room independent review

Verdict: approve the frozen Batch41 feature within the static/source/still review scope. No introduced Critical/P0, High/P1, Medium/P2, or Low/P3 finding was established. This verdict does not certify whole-app layout or accessibility. The disclosed enlarged-text speech overlay remains a separate Batch42 issue.

Reviewed on 2026-10-12 in `/home/robert/.codex/worktrees/4511/chore-pet`, against base commit `4af7b9824dfadafff61631b72fc1f0c2a5af83a3`. The independent work consisted of source/history reads, in-memory patch reconstruction, SHA-256 verification, log inspection, and viewing all supplied stills. No builds, tests, browser sessions, installs, network access, Git mutations, additional agents, or external messages were used. The only authored file is this report.

The exact immutable input is [explore-show-review-input.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/explore-show-review-input.json), SHA-256:

`2061322af17fb1be70db84983871ee102411d62ccc1548485be27f708616837c`

| Integrity item | Independently verified result |
| --- | --- |
| Freeze file | SHA-256 `e599fe6e05a3ce127c3c9b84721e8b6ee5cca710a1682de660de7af23ca04eeb`; parsed contents equal the input's embedded freeze |
| Changed sources | All 12 current byte hashes match; ten differ from the base and two are additions absent from the base |
| Unchanged dependencies | All nine current hashes match both the freeze and their bytes at the base commit |
| Frozen source patch | SHA-256 `a381b29109b9cef0088b59568a456db422c4f8631c69ba1bbe64e5d9b7e53054`; reconstructs all 12 current files exactly from the base, including both additions; no extra patch paths |
| Capture manifest | SHA-256 `97b0f00286709509e3f6d6e9a450ea91f66e659511c3a72bf7febecf727b6edc` matches the immutable input |
| Captures | All 21 hashes match the manifest: 14 PNGs and seven JSON records |
| Raw checks | All 11 log hashes and 11 exit-file hashes match; each exit-file value equals the recorded exit code |

The nine unchanged dependencies are the player panel, resident renderer, motion and visibility hooks, behaviour and activity samplers, character motion, and scene TSX/CSS. The frozen patch contains no edits to these files. Read-only history identifies the base as "Settle concern appendages in one restrained sway", following the quiet-rest and enlarged-text work.

The implementation preserves the intended boundaries:

- [App.tsx:731](/home/robert/.codex/worktrees/4511/chore-pet/src/App.tsx:731) extracts the existing player Show room operation into `showResidentRoom`. It retains the journey and resident/focused-room checks, scene and interactive-resident DOM checks, instant scene scroll, and resident focus with `preventScroll`. The added missing-room guard is conservative. Both panels use this same function and availability explanation. It does not invite, change the focused room, alter the scene camera, write saved data, or create an animation loop. The resident's existing focus handler updates attention only.
- [PetExplore.tsx:53](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetExplore.tsx:53) renders a native Show room button only when Explore is expanded and a callback exists. Its accessible name, `Show room to explore with <name>`, differs from the player panel's `Show room with <name>`. The original expansion control, furnishing label, select, and invitation action remain intact. The callback neither changes selection nor runs the preview effect or invitation callback.
- [PetExplore.tsx:37](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetExplore.tsx:37) keeps invitation eligibility separate from viewing. Away/sick residents remain viewable in their own room while invitations stay disabled. Travel disables viewing. A different focused room can supply its own view explanation alongside the resting explanation. `aria-describedby` resolves to the shared note when the texts match and to the separate view note when they differ; `useId` separates panel instances.
- [PetExplore.tsx:59](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetExplore.tsx:59) records a false view result and exposes "The room is unavailable right now. Try again shortly." through the existing status region. Successful retry, explicit selection change, and a fresh invitation clear that failure. Ordinary successful viewing preserves the existing invitation feedback rather than issuing a second success message.
- [PetExplore.css:3](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetExplore.css:3) permits the heading to wrap and keeps the new target at least 44 by 44 CSS pixels. The seven samples support that sizing and text fit. The [ART.md addition](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md:203) describes the resulting interaction without expanding the claim to whole-app acceptance.

The eight new [component cases](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetExplore.showRoom.test.tsx:21) cover optional/expanded rendering, successful view preservation, failed view and retry, away and sick eligibility, linked travel explanation and recovery, separate other-room/resting notes, and clearing failure on invitation. These cases use mocked callbacks; they establish component contracts, not native scrolling or assistive-technology announcements.

The nine new [native cases](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-explore-show-room.test.mjs:18) exercise seven layout samples plus actual blocked-door fixtures for away and sick residents. Their assertions check Enter activation, focus-visible on the same resident node, at least 95% clipped geometric body visibility, unchanged body/position/speech/feedback/selection/marker/camera/saved tables, and at most one pending application frame. The resting fixtures require disabled viewing in the other room and successful viewing with zero frames back in the resident's room. Native failure of the DOM lookup and a live in-flight Explore transition are not directly exercised by these nine cases; the former feedback and travel eligibility have component coverage and explicit source guards.

All six existing fixture files receive role-specific combobox locators while keeping the `Show` accessible-name requirement. There are nine locator replacements across concern, dust, environment attention, repeated furnishing names, Explore, and rest fixtures. They resolve the real ambiguity introduced by another control whose name starts with `Show`. The changes do not loosen the existing motion, marker, dialogue, saved-data, or invitation assertions. The names and Explore keyboard fixtures explicitly assert the new Show room Tab stop, then Tab to the select; the Explore size loop also includes the new button. No case or assertion was removed to obtain a pass.

The root evidence supports the scoped claims, with the following history preserved rather than treating every command as successful:

| Frozen check | Exit | Raw result and interpretation |
| --- | --- | --- |
| `red` | 1 | Eight component cases fail before the control exists; 599 ms total |
| `native-red` | 1 | Missing Explore view-control assertion fails in the 390 sample; case 832.8 ms, run 1202.6 ms |
| `focused` | 0 | 148 tests across four files pass in 4.49 s |
| `build` | 0 | TypeScript and production build complete; Vite emits a chunk-size advisory, so this is not a warning-free build claim |
| `native` | 1 | 24 cases, 18 pass and six fail from strict ambiguity in the old `getByLabel(/^Show /)` locator; all nine new and nine existing Show room cases pass |
| `native-final` | 1 | 43 cases, 37 pass and six fail at the old immediate-select focus expectation; 59.940 s; all nine new and nine existing Show room cases pass again |
| `keyboard-final` | 0 | The six affected keyboard cases pass after asserting the added Tab stop; 5.815 s |
| `full` | 0 | 2,285 tests across 113 files pass in 77.15 s |
| `lint` | 0 | oxlint completes; no warning/error output |
| `lint-final` | 0 | Same lint output and successful exit |
| `diff` | 0 | Empty whitespace-check log and successful exit |

Thus the supplied native record establishes passing coverage for 43 distinct cases across the 37-pass run and the six-case follow-up. It does not contain one final 43/43 command. The fixture-failure explanations agree with both the raw diagnostics and the final patch; they establish no product failure. Root reports the captures came from the first 18 passing cases and that product/new-native bytes stayed unchanged afterward. The repeated passes and current freeze are consistent with that account. This review verifies the supplied evidence's bytes and consistency, not an independently reproduced build or contemporaneous binary-to-source attestation.

I inspected both PNGs and the JSON in every row below. Each capture set lives in [explore-show-captures](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/explore-show-captures). For suffix `S`, the three exact filenames are `explore-show-controls-S.png`, `explore-show-S.png`, and `explore-show-S.json`.

| Suffix | Viewport / root text / motion | Show room target in JSON | Still review |
| --- | --- | --- | --- |
| `320-100` | 320x640 / 100% / reduced | 105.94x44 | Single-row heading fits; room view restores the resident and selection marker |
| `320-200` | 320x640 / 200% / reduced | 181.88x60 | Heading wraps into two rows; resident remains visible after viewing; disclosed speech/Home view overlap is present |
| `390-100` | 390x664 / 100% / normal | 105.94x44 | Single-row heading and invitation feedback fit; resident and selected furnishing remain in the restored view |
| `844-100` | 844x390 / 100% / reduced | 105.94x44 | Heading fits the side column; paired room view shows resident focus without changing the scene composition |
| `844-200` | 844x390 / 200% / reduced | 181.88x60 | Two-row heading fits; resident remains visible; disclosed speech/Home view overlap and limited vertical space remain |
| `1280-100` | 1280x800 / 100% / normal | 105.94x44 | Heading, select and Look action fit; room pair retains marker and feedback while adding resident focus |
| `1280-200` | 1280x800 / 200% / reduced | 181.88x60 | Heading wraps; larger controls and feedback fit; room pair preserves furnishing context and shows resident focus |

All JSON records retain a nonempty selected object ID, the expected `invited` or `noticed` feedback for the motion setting, and camera coordinates `{x: 0, y: 0}`. The controls measurements fit inside their heading and viewport horizontally. At 200% the heading height is 124 pixels; at 100% it is 44. A room-view scroll can move the lower Explore controls or feedback outside the viewport on phones; the paired controls captures provide the separate control inspection. Neither the stills nor the JSON independently prove temporal playback.

Severity and exclusions are explicit:

- Critical/P0 and High/P1: no introduced finding.
- Medium/P2 and Low/P3: no introduced finding established within Batch41.
- Existing Medium/P2 layout issue, excluded from this feature verdict: enlarged speech overlaps Home view controls in the disclosed 320/844 200% states. The unchanged [HomeScene.css:32](/home/robert/.codex/worktrees/4511/chore-pet/src/room/HomeScene.css:32) places dialogue at a fixed 52-pixel offset. The supplied stills confirm the overlap. The user assigns this preexisting issue to Batch42; approval here does not resolve it or certify the whole app.

Other behaviours considered and set aside are browser zoom and physical-device rendering, assistive-technology announcement quality, other browsers, exhaustive room arrangements and user camera positions, and whole-app acceptance. The supplied matrix samples Chromium 152.0.7977.82 with root font sizes of 100% and 200%; it does not establish those broader behaviours. The visible-area helper measures clipping geometry, not occlusion by other painted content. The new Explore samples freeze the clock and check immediate preservation, not invitation completion or deadline timing. The unchanged existing player Show room real-clock case supplies the separate deadline/no-replay evidence for the shared operation.

The new disjoint `/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/scene-dialogue.test.mjs`, its CSS-injection prototype, and its artifacts were excluded and not inspected. Root's heavy-job scheduling, memory, and temporary-space statements were not independently measured. All execution results above are attributed to the frozen root logs. This report authorizes no source changes or Git action.
