Batch33 independent static/source and still-image review, 2026-10-12.

Approve the bounded device-local pet-motion change. No actionable Critical, Important, or Minor findings were identified in the frozen patch. This approves the requested static/source and still-image review only. The full unit suite is running sequentially under root and remains pending for this report; it is not claimed passed or included in the approval.

The review used the requesting-code-review workflow and its independent reviewer criteria. I read the three supplied manifests, the loop-equivalence record, all 15 frozen files and their patch against `07df6379ad5c9ea3984dc66648b3b60c69a147ab`. HEAD was that base commit, so the reviewed change is the frozen working-tree patch. Related existing consumer code and fixtures were read only to assess Batch33 integration. No builds, tests, browsers, agents, or messages to other chats were run. This report is the sole file written; runtime, tests, manifests, and historical audits were preserved.

Integrity checks independently recomputed SHA-256 values and confirmed all 15 source entries, the patch, all five PNGs, the loop-equivalence artifact, the artifacts manifest, and all 20 recorded check logs and exit files. Exit-file contents also match their recorded exit codes. The embedded verification freeze equals the separate freeze manifest. Applying each patch hunk in memory to its base content reconstructed the exact current bytes for all 15 frozen paths, with no missing or extra patch paths. The sources were rechecked before writing this report and still matched.

| Reviewed evidence | SHA-256 |
| --- | --- |
| `motion-preference-verification.json` at review | `6beffa1d89d396ca9b56953a8230a91ef96f63ad6cd0f2badd8db0a3508dd6ab` |
| `motion-preference-freeze.json` | `b187122dae18454ebc1499b2014bc261e1e0ebe05a95cddd9130db815e51f3f7` |
| `motion-preference-source.diff` | `117bb84c741255f78c616f14e10bbe8315897c001df15f946438ce9db3a5e511` |
| `motion-preference-artifacts.json` | `408252348d85f2b3f2f759b389855eb8b13fae437a38d2c2ee2d432ea4132b11` |
| `motion-preference-loop-equivalence.json` | `e549d7b5dcaed16cac365650fe85035b25a0c85c88922e92c2bfe38e5828a67a` |
| Exact existing RAF scheduling suffix | `e99f97f1e6b1a2003ababc4031836f0cfbe458e9cff1a4cec08e8ee9f04864b8` |

The implementation has a narrow storage boundary and preserves the existing scheduling model. The following contract checks support approval.

| Contract | Source review |
| --- | --- |
| Device choice defaults off; system reduction remains authoritative | [motionPreference.ts:10](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/motionPreference.ts:10) accepts only stored `on`. [usePetMotion.ts:30](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts:30) and its live update compute device OR system. Turning the device choice off cannot disable system reduction. |
| Blocked storage and idle remounts | [motionPreference.ts:14](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/motionPreference.ts:14) refreshes readable storage while no consumers exist. Failed writes retain the visit choice through `unsavedChoice`, including when an older value remains readable. Read/write exceptions are caught. Only the scoped `chore-pet-reduce-motion` key is persisted. |
| Cross-tab lifecycle and callback cleanup | [motionPreference.ts:42](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/motionPreference.ts:42) filters unrelated keys and session storage, handles removal/clear as off, and avoids echo writes. Subscriptions share one native listener, own separate cleanup wrappers, and detach after the final consumer. Notification checks membership so a callback removed earlier in the same dispatch is skipped. |
| Hook races and existing frame ownership | [usePetMotion.ts:23](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts:23) updates callbacks in layout effects. Preference updates write the ref before notifying, reconcile the render-to-subscribe gap, work without matchMedia, and clean up both subscriptions. Callbacks announce only effective OR-policy changes, including while inactive. The RAF scheduling effect through the end of the file, starting at line 52, is byte-identical to the base and recorded suffix hash. Its disposed/pending guards, visibility handling, resume order, and cleanup remain intact. |
| Native described Settings checkbox | [SettingsScreen.tsx:33](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/SettingsScreen.tsx:33) subscribes through `useSyncExternalStore`. [SettingsScreen.tsx:68](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/SettingsScreen.tsx:68) uses a native checkbox inside its label, a unique described-by help paragraph, and the device value as checked state. It does not close Settings or write home/account state. |
| Accurate developer wording and retained controls | [GalleryMotion.tsx:51](/home/robert/.codex/worktrees/4511/chore-pet/src/dev/GalleryMotion.tsx:51) and [MotionReview.tsx:172](/home/robert/.codex/worktrees/4511/chore-pet/src/dev/MotionReview.tsx:172) say reduced motion is active without attributing a device choice to the OS. Gallery intent cancels on reduction and stays cancelled on restoration. The deterministic panel retains its explicit timeline and local override, while preferred reduction remains authoritative over sampled art. |
| Existing CSS Cheer and finite cleanup | [Cheer.tsx:46](/home/robert/.codex/worktrees/4511/chore-pet/src/effects/Cheer.tsx:46) uses an inactive hook, requesting no frames. Its single existing timeout retains the initial 1200ms or 1750ms deadline, reads the current completion callback, and clears on unmount. Either effective preference change permanently settles the current hop/burst effect without replay or deadline extension. [effects.css:107](/home/robert/.codex/worktrees/4511/chore-pet/src/effects/effects.css:107) suppresses hop, breathing, and blinks under reduction, retains bounded static accent fades, and hides settled bursts. Existing OS media rules remain. Welcome and gift consumers share this Cheer implementation; gallery additionally cancels its effect owner. |
| No added runtime clock or timer | The store and preference subscription add none. Cheer replaces the existing preference read for its existing timeout; it does not add another timeout. The RAF suffix remains exact. No home/account fields or backend writes are introduced. The ART changes describe this limited pet/preview policy. |

For loop equivalence, I compared both current and base bytes, and recomputed the recorded SHA-256 for each of the six unchanged paths: `src/character/motion.ts`, `src/character/AnimatedCharacter.tsx`, `src/pet/behaviour.ts`, `src/pet/activityMotion.ts`, `src/pet/interactions.ts`, and `src/pet/LivingRoom.tsx`. All match the base exactly. Together with the exact 1065-byte RAF suffix, this supports source equivalence, not a device-performance claim.

The tests exercise observable behavior rather than only implementation calls. Store coverage includes invalid/default values, persistence and duplicate suppression, blocked reads/writes, scoped storage events, clear, listener ownership, no-consumer refresh, and same-dispatch unsubscription. Hook coverage checks initial/live device reduction, effective OR transitions, frame cancellation/resumption, latest inactive callbacks, missing matchMedia, and the render/subscription race. Existing hook tests cover Strict Mode, queued cancelled frames, hidden tabs, callback replacement, and unmount during ticks. Settings tests check its label, description, persistence, synchronization, and staying open. Developer tests check neutral messages, cancelled gallery intent, and preserved review time/local override. Cheer tests cover both preference sources, the unchanged deadline, restoration without replay, no RAF, and timeout cancellation on unmount.

Recorded execution evidence was read and hash-verified, not rerun here:

- `motion-preference-cheer-copy.log` records 36 final targeted unit cases across Cheer, GalleryMotion, and MotionReview passing in 4.27s, with exit 0.
- `motion-preference-final-browser.log` records 11 final native Chromium cases passing in 55.779s, with exit 0. These include six gallery cases plus five preference cases. The preference runner checks native keyboard operation and focus, a minimum 44px label target, persistence/reload, a visible resident with zero settled frames and one finite-response clock, unchanged saved tables, system authority, real cross-tab storage, wardrobe cancellation without replay, and CSS Cheer policy/deadlines.
- `motion-preference-regression.log` records the earlier 26 native passes in 86.086s. Its 20 unaffected creator/review/resident/wardrobe cases remain applicable. Its six gallery cases are superseded by the final native run and are not counted again as additional final cases.
- The earlier 185 focused unit passes predate the developer-wording and Cheer refinements. They are supporting earlier evidence, not 185 final frozen-source passes. Separate store/hook logs record their earlier passing checks.
- Final type/build and lint logs have recorded exit 0. The build log includes a bundle-size advisory. The full unit suite remains pending and is not certified by these logs.

Fixture interpretation matters. The first Cheer native red timed out while waiting for the lazy Art gallery heading with its loading/Suspense clock paused; it never reached the motion-policy assertion and is not a product-policy failure. The replacement permits native gallery loading and the retained policy-red log then fails the actual assertion about suppressing CSS hop, breathing, and blink animation names. The final runner reaches that assertion and passes. Gallery CSS already forces its character breathing/blinks still, so this native fixture independently establishes the Cheer hop/fade policy but does not isolate the new breathing/blink selectors in welcome or gifts. Their applicability is supported here by the shared source and CSS inspection. In Cheer unit tests, jsdom's queued zero-delay cross-document StorageEvent is drained separately before timer-count checks; that queue is not an added application timer or a leaked Cheer deadline.

All five final PNGs were opened individually with `view_image`, after hash verification:

| Final still | Independent observation |
| --- | --- |
| `motion-preference-settings-1280.png`, 1280x800 | Checked native choice, visible focus ring, readable help text, and two-column cards have no visible overlap. |
| `motion-preference-settings-320.png`, 320x640 | Choice and full help paragraph wrap within the card and remain above navigation. The lower progress card continues below the captured scroll region. |
| `motion-preference-home-1280.png`, 1280x800 | Resident, speech bubble, room, and adjacent controls are readable without visible new clipping or overlap. |
| `motion-preference-home-320.png`, 320x640 | Resident and bubble fit the scaled room. Existing bottom navigation remains visible; lower Home content extends beyond this still. |
| `motion-preference-cheer-1280.png`, 1240x285 element crop from the 1280px viewport | All three cheering species and their visible marks fit the crop, including Bun's ears and Sprout's leaves. Captions are readable. |

The behaviors considered and declined to certify are listed explicitly below.

- Whole-app motion suppression, including general page transitions, room sparkles, and unrelated CSS, is outside the stated device-local pet/preview contract. Those retain their existing system policy.
- Human playback quality, temporal comfort, interruption appearance, and actual fade perception cannot be established by static sources and five stills. Automated deadline/markup checks provide bounded evidence only.
- Physical-device behavior, browser coverage beyond the recorded Chromium run, assistive-technology use, CPU/battery cost, and performance certification are outside this review. Mocked unit clocks and isolated offline native fixtures do not establish them.
- A completed full-suite result is outside the evidence available to this review. Root's sequential full run remains pending; this approval must not be represented as a full-suite pass.

No fixes are requested for this frozen Batch33 patch. Integration still needs root's separate full-suite result.
