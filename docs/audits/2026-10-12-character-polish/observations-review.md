**Approve with limits.** No actionable findings in frozen batch9. The source supports all requested observation, fallback, priority, accessibility and resource contracts. Recommendation `merge`, workflow label `human_review_required`. This approves the frozen patch's source and art correspondence; root execution evidence and human temporal acceptance remain separate.

Reviewed on 2026-10-12, with stored-log cutoff at 18:51 UTC. Scope is [observations.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations.diff) against `b257455bc99fe0b525144d8083a55bed6ec14020`. HEAD resolved to that same base. The four scoped working-file changes reproduce the frozen diff byte for byte using Git's `i/` and `w/` prefixes. An unrelated working change in `src/dev/MotionReview.test.tsx` was excluded. This is a frozen-artifact review, not a review of the whole working tree.

Only this review file was written. Inspection used source reads, read-only Git queries, hashes and two existing art sheets. No source edits, Git mutation, agents, builds, tests or browser execution were performed. No old SDD tasks were started.

The immutable identities below were unchanged at the final pre-write read. SHA-256 values identify exact bytes, including the supplied diff's prefixes.

| Artifact | SHA-256 |
| --- | --- |
| [observations.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations.diff) | `2021e5a34ff5e0488d5973e68d81d36361247648d563ff493fe7f93764f69aad` |
| [petLines.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/content/petLines.ts) | `d67a5d6c30144b3c90e444ee3f79bae1c902e109f546ffd8f84cb5b9fc55e89a` |
| [LivingRoom.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx) | `75c30c91b555fe99c2a66e7f7b3c26822cb83629de4fea16a9e8e0ebc558f308` |
| [petLines.test.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/content/petLines.test.ts) | `7827fddf4a522cee30b78d53c0cb0681bed49830087cfe78c546c4c2e42751b6` |
| [PetIntegration.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetIntegration.test.tsx) | `e784a0b09cb7a5c0b3f36a0a468810a565997406debb4a0db6b26dd5ca94d2b4` |

I independently compared the 19 keys with the actual [PROFILES map](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:29) and the [catalog and reward decor](/home/robert/.codex/worktrees/4511/chore-pet/src/catalog/objects.ts:307). Every existing explicit profile has exactly two distinct, nonempty observations. All 38 lines fit the existing under-60-character constraint, use plain sentence-case text, contain no placeholders or species anatomy, and introduce no blame, urgency or cleaning request. The furniture lines describe comfort without claiming that the pet sits on furniture or completes a chore.

| Profile | Independently inspected art supporting the two lines |
| --- | --- |
| shower | [Tilted shower-head disc and spray holes](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/shower.tsx:68), supporting the tiny-hat comparison. |
| toilet | [Small round flush button on the tank lid](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/toilet.tsx:18). |
| washer | [Round door ring and glass window](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/washer.tsx:21). The text describes the window's purpose without inventing visible clean-stage laundry. |
| sink | [Basin and curved faucet](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/sink.tsx:52). |
| stove | [Clean pot, lid and top knob](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/stove.tsx:68). |
| fridge | [Round warm-red freezer magnet](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/fridge.tsx:43). |
| counter | [Tomato slices on the chopping board](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/counter.tsx:84). The wording is a broad description of the visible tomato detail. |
| plant | [Clean two-tone leaves](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/plant.tsx:75); the existing clean profile uses `wave`. |
| fish-tank | [Two fish in the clean tank](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/fishTank.tsx:163); the existing clean profile uses `wave`. |
| bookshelf | [Multicoloured books, including a red upper-shelf book](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/bookshelf.tsx:104). |
| teddy | [Rounded stuffed body](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/teddy.tsx:79) and [smiling face](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/teddy.tsx:63). |
| lamp | [Flared shade](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/lamp.tsx:118) and [warm glow](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/lamp.tsx:96). |
| poster | [Sun and two hills inside the frame](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/poster.tsx:24). |
| wall-clock | [Round face and two hands](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/wallClock.tsx:51). "I'm in no hurry" keeps the clock line free of urgency. |
| fairy-lights | [Coloured bulbs along three swags](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/fairyLights.tsx:88). |
| bed | [Thick quilt and folded cream edge](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/bed.tsx:57), supporting the comfort and daydream lines. |
| couch | [Rounded seat and back cushions](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/couch.tsx:40). |
| bean-bag | [Soft lobes, central dip and creases](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/beanBag.tsx:24), supporting the cloud and nest comparisons. |
| rug | [Dotted border and central flower](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/rug.tsx:41). |

I also inspected the existing [bathroom detail sheet](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/bathroom-targets.png) and [kitchen detail sheet](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/environment-targets.png). They show the seven fixture details in both mirrors. All seven current fixture-source hashes match their respective stored capture manifests. These earlier sheets corroborate art details; they do not demonstrate batch9 bubble layout or temporal playback. The other twelve profiles were checked against their SVG source, without producing new renders.

The affected production path is [App's resident LivingRoom](/home/robert/.codex/worktrees/4511/chore-pet/src/App.tsx:730), then [interaction dialogue selection](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:244), then the content helper. HomeScene's portal receives the same selected line. No catalog, art, persistence, scheduling, travel, authentication, dependency or build configuration changes are in the frozen patch.

| Contract and counterexample | Source result and regression protection |
| --- | --- |
| A healthy target must not inherit an unrelated object's overdue dialogue. | The changed expression runs only when this target has level zero and a clean stage. Selection uses this target's catalog ID. The messy expression, mood lists, condition lists and chore-specific lists remain unchanged. Integration cases cover plant, sink and counter with and without another overdue object, plus neglect levels 1, 2 and 3. |
| Phase transitions increment `state.beat` and could switch the text. | [advance](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:192) retains the opening `interactionBeat` while the target reference stays the same. [Behavior phase transitions](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:350) spread the activity and retain that target. The selector still consumes the held seed. Existing integration coverage now requires a clean plant observation at orient, action and settle, including boundary samples. |
| A tap or completion could be overwritten by ambient text or announced twice. | `said` still precedes the interaction branch. Tap and completion still set `heard: true`; the live region still renders only `said`, including when visible dialogue uses the HomeScene portal. Tests exercise immediate tap replacement and completion consumption. Ambient assertions explicitly require an empty live region. |
| An unmapped fixture or inherited catalog key could crash or select a prototype value. | Both [calmObjectLine and objectLine](/home/robert/.codex/worktrees/4511/chore-pet/src/content/petLines.ts:336) use `Object.prototype.hasOwnProperty.call` for their general tables. `catalogEntry` uses array `find`, so inherited catalog names cannot supply a chore index. The new helper returns an empty string for missing/inherited names, allowing the caller's calm mood fallback. Chore-specific precedence remains intact. Tests cover unknown names, empty input, prototype names, unusual numeric seeds, valid catalog chores, and actual teddy/dishwasher integration. |
| New dialogue could introduce a second clock or per-frame room work. | The addition is a static 38-string table and a pure lookup through the existing deterministic picker. It adds no state, random choice, effect, timer, observer, listener or RAF request. Character frames remain in RoomPetArt; [needsRender](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:418) still controls room updates. Existing [usePetMotion](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts:40) cancels hidden-document frames. The extra two-element filtering occurs during dialogue renders, without changing deadlines or subscription count. |

The new table is included in [ALL_LISTS](/home/robert/.codex/worktrees/4511/chore-pet/src/content/petLines.test.ts:35), so the existing length, ASCII, duplicate, sentence-case, forbidden-tone, species-word and placeholder assertions cover it. The 19-ID test uses a handwritten expected list rather than deriving it from PROFILES. I independently checked that list against the current map; automatic detection of future profile additions remains a coverage limit. Integration assertions exercise representative IDs through the shared branch, rather than mounting all 19 profiles or every species. Source inspection supplies the remaining current coverage.

Stored evidence was read, not executed by this reviewer.

| Stored log | What the inspected bytes establish |
| --- | --- |
| [observations-red.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-red.log) | Reports 12 failures and 77 passes, including the inherited-key `lines.filter` crash and old calm mood text where target observations were expected. This earlier 89-test set is not the complete final test set. |
| [observations-green.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-green.log) | Despite its name, reports one failure and 98 passes. Its combined decor/fallback fixture failed when the second mounted pet had not reached its initial deadline. The frozen test isolates the two cases with `it.each`, allowing `beforeEach` to reset the clock. |
| [observations-focused.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-focused.log) | Final footer reports 100 tests in two files passing, 3.42 seconds, with `--maxWorkers=1`. |
| [observations-unit.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-unit.log) | At cutoff, contains the completed footer reporting 1,952 tests in 87 files passing, 53.75 seconds, with `--maxWorkers=1`. |
| [observations-build.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-build.log) | Records `tsc -b && vite build`, Vite completion and PWA generation, with a chunk-size advisory. |
| [observations-lint.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-lint.log) | Contains the oxlint invocation only. No diagnostic output or captured exit status establishes the lint result. |
| [observations-browser.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/observations-browser.log) | Reports eight resident regressions passing, zero failures/skips/cancellations, 11.49 seconds, Chromium 152.0.7977.82 in an isolated offline production preview. The inspected browser source covers resident motion, input and announcements; it does not assert all 38 new strings or hold them across every interaction phase. |

The reviewed logs contain no captured process exit statuses or per-run binding to the four frozen source hashes. I therefore do not certify exits, warning-free lint, or exact-artifact execution. Root should retain its own command/exit/source evidence. The logged one-worker commands support bounded unit concurrency; overlapping root processes and current memory headroom were not audited. This reviewer started no heavy checks.

| Risk dimension | Assessment |
| --- | --- |
| Impact if wrong | Low. A regression affects local dialogue or rendering, with no saved-state change. |
| Regression likelihood | Moderate. The narrow source change rejects the inspected counterexamples; exact-artifact execution and human playback remain unverified here. |
| Regression protection | Partial. Content and representative integration assertions cover the changed behavior; stored results lack execution identity and exit metadata. |
| Recoverability | Easy. Revert this isolated content/helper/call-site change; no migration or data repair is needed. |
| Confidence | Moderate overall, with direct source and art evidence for the requested contracts. |
| Status quo risk | Low. Existing clean interactions remain generic; direct inherited-key calls to objectLine can throw, as shown in the earlier stored red output. |

Human temporal playback remains open. Still art and sampled DOM assertions cannot establish the readability, perceived timing or feel of the held observations in the real home. This review adds no temporal acceptance claim or automatic-merge eligibility.

The structured assessment below is included in this sole requested artifact. Its helper validator was not executed under the reviewer-check restriction.

```json
{
  "schemaVersion": 1,
  "patch": {
    "repository": "/home/robert/.codex/worktrees/4511/chore-pet",
    "sourceType": "patch_file",
    "base": "b257455bc99fe0b525144d8083a55bed6ec14020",
    "head": "Frozen uncommitted batch9 observations.diff, identified by patch SHA-256; no resulting commit supplied",
    "changedFiles": ["src/content/petLines.test.ts", "src/content/petLines.ts", "src/pet/LivingRoom.tsx", "src/pet/PetIntegration.test.tsx"],
    "sha256": "2021e5a34ff5e0488d5973e68d81d36361247648d563ff493fe7f93764f69aad"
  },
  "recommendation": "merge",
  "workflowLabel": "human_review_required",
  "impact": {"rating": "low", "rationale": "Local dialogue and rendering only; no persistence or privileged boundary changes."},
  "regressionLikelihood": {"rating": "moderate", "rationale": "Source counterexamples are rejected, with bounded uncertainty from missing exact-artifact execution metadata and temporal acceptance."},
  "regressionProtection": {"rating": "partial", "rationale": "Useful content and caller assertions exist; root logs report passes but lack per-run source binding and captured exits.", "exactHeadChecksPassed": false},
  "recoverability": {"rating": "easy", "rationale": "Isolated revert with no migration or incompatible persisted state."},
  "confidence": {"rating": "moderate", "rationale": "Exact frozen diff, relevant callers and all 19 art claims inspected; execution identity and human playback remain separate."},
  "applicability": {"status": "confirmed", "rationale": "App mounts the resident LivingRoom, which consumes the changed helpers and observation table."},
  "statusQuoRisk": {"rating": "low", "rationale": "Generic clean chatter remains; inherited objectLine keys can throw, supported by source and stored red output."},
  "autoMergeExclusions": ["other"],
  "affectedRuntimeRoots": ["src/App.tsx resident LivingRoom", "src/pet/LivingRoom.tsx direct bubble and HomeScene dialogue portal"],
  "importantCallers": ["LivingRoom interact selection", "LivingRoom legacy look selection through objectLine"],
  "riskDrivers": ["Shared objectLine fallback", "Held dialogue across activity changes", "Missing root exit and exact-source execution metadata"],
  "protectiveFactors": ["Own-property table guards", "Unchanged condition branch and speech priority", "No new clock or persistent state", "Content and representative integration assertions"],
  "materialBoundaries": [
    {"id": "content", "invariant": "Two short, neutral, art-grounded lines for every explicit profile", "runtimeRoot": "LivingRoom clean interactions", "counterexample": "A reward profile is omitted or references absent art", "legitimateControl": "Current PROFILES and catalog independently compared with all 38 lines and SVG definitions", "result": "supported"},
    {"id": "condition", "invariant": "Only a healthy target receives observations", "runtimeRoot": "LivingRoom interaction dialogue", "counterexample": "Another overdue object contaminates clean-target speech, or neglect receives calm content", "legitimateControl": "Target-local stage and level gate; messy expression unchanged; representative integration assertions", "result": "supported"},
    {"id": "seed", "invariant": "One selection persists through orient, action and settle", "runtimeRoot": "LivingRoom advance and dialogue selection", "counterexample": "Phase beat increments switch observation", "legitimateControl": "Held interactionBeat survives phase changes because behavior retains the target reference", "result": "supported"},
    {"id": "keys", "invariant": "Unknown and inherited lookup keys return quiet fallback", "runtimeRoot": "calmObjectLine and objectLine", "counterexample": "constructor, toString or __proto__ is passed to the picker as a non-array", "legitimateControl": "Own-property guards plus array-based catalogEntry; focused assertions and earlier failure evidence", "result": "supported"},
    {"id": "speech", "invariant": "Player speech wins and ambient dialogue is silent in aria-live", "runtimeRoot": "LivingRoom visual bubble, HomeScene portal and live region", "counterexample": "Ambient observation replaces a greeting or is announced", "legitimateControl": "said remains first; live region reads only heard said text; interruption and announcement assertions", "result": "supported"},
    {"id": "resources", "invariant": "No added clock, subscription or per-frame room update", "runtimeRoot": "RoomPetArt, LivingRoom and usePetMotion", "counterexample": "Observation selection starts a timer or frame-driven parent update", "legitimateControl": "Static table and pure lookup only; existing rendering and visibility clock paths unchanged", "result": "supported"}
  ],
  "validation": [
    {"name": "Static frozen-source and art inspection", "status": "passed", "protects": "Current content coverage, art correspondence, helper guards, caller semantics and resource structure"},
    {"name": "Root exact-artifact execution attestation", "status": "unavailable", "protects": "Logs report 100 focused, 1952 full-unit and 8 browser passes plus build completion, but reviewed bytes contain no captured exits or per-run source binding"},
    {"name": "Fresh reviewer checks and schema-helper execution", "status": "skipped", "protects": "Omitted under the user's reviewer-only resource and execution restrictions"},
    {"name": "Human temporal playback", "status": "unavailable", "protects": "Perceived timing, readability and real-home presentation remain open"}
  ],
  "unknowns": [
    {"summary": "Root process exits and exact-source execution identity are not established by the reviewed logs", "decisionCritical": false},
    {"summary": "Human temporal acceptance remains open", "decisionCritical": false},
    {"summary": "Current root process overlap and memory headroom were not audited", "decisionCritical": false}
  ],
  "evidencePlan": []
}
```
