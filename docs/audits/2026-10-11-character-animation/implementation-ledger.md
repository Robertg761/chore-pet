# SDD ledger — plan: docs/superpowers/plans/2026-10-11-character-animation.md

Base: a4e8390. Existing detached linked worktree verified; no submodule. Dependencies installed offline.

| Tasks | Interface or shared file | Preflight finding |
| --- | --- | --- |
| 1,2 | MotionFrame into articulated renderer | Consistent; radians/degrees must be documented in sampler. |
| 1,4 | MotionInput and ACTION_MS into sequence mapping | Consistent. |
| 1,5,6 | Sampler into home integration and review panel | Consistent. |
| 2,5,6 | AnimatedCharacterArt | Consistent; frame updates must be restricted to character subtree. |
| 3,4 | InteractionTarget and World.interactions | Consistent; existing test fixtures need default empty list. |
| 4,5 | behaviour and motionFor | Consistent; preserve fractional position on interruption. |
| 5,7 | room integration and browser evidence | Consistent. |
| 2,7 | Character and ART documentation | Consistent; final review may refine Task 2 art. |
| 6,7 | review panel and captures | Consistent. |
| 1 | self-consistency | Looping gait has no finite endpoint; only finite actions settle neutral. |
| 2 | self-consistency | Runtime JSX functions return ReactNode; preserve static callers. |
| 3 | self-consistency | Contacts require actual geometry; safe inspect fallback otherwise. |
| 4 | self-consistency | Fractional continuation needs segment support rather than grid rounding. |
| 5 | self-consistency | Browser clock owns preferences and cleanup; no room-wide frame renders. |
| 6 | self-consistency | Key frames sampled from production code. |
| 7 | self-consistency | Browser helper defaults reduced motion; explicitly opt into motion tests. |

Ruling: Allow parallel implementation only for disjoint file sets in Tasks 1 and 3, as the approved plan describes — avoids shared-state editing conflicts and saves time — if wrong, integration requires rework.

Ruling: Controller owns Git commits because the worktree Git index is outside the writable sandbox — workers report exact changed paths without staging — if wrong, commit attribution differs but source review remains available.

Task 1: pending.
Task 2: pending.
Task 3: pending.
Task 4: pending.
Task 5: pending.
Task 6: pending.
Task 7: pending.

Baseline: npm test passed 75 files, 1564 tests. Local dev server running on http://127.0.0.1:5187/ with Supabase disabled. Browser baseline confirms pet is about 25px at default fit zoom; review must include home fit and enlarged view.
Ruling: Start Task 5 clock implementation alongside disjoint Tasks 1/3 — hook has no sampler/renderer dependency — if wrong, defer its integration until dependency reviews pass.

Task 1: complete (commit 0c6e389, spec PASS, quality approved with minor).
Task 1: minor (deferred): add walk fade joins and changing-distance stride-boundary continuity tests in Task 7.
Task 3: implemented 95151bf, independent review in progress.

Task 3: complete (commit 95151bf, spec PASS, quality approved with minor).
Task 3: minor (deferred to Task 4): stage lookups must use own properties for reserved object IDs.
Ruling: Extract existing pathfinding into a pure pet/pathfinding.ts if needed when Task 4 consumes chooseInteraction — avoids a runtime cycle without duplicating route selection — if wrong, adds one small file and re-export compatibility.

Task 5 clock: complete, spec/quality PASS; integration pending.
Ruling: Develop Task 6 review panel against the stable AnimatedCharacterArt interface while Task 2 finishes — disjoint dev files and deterministic public sampler — if wrong, adjust panel integration after renderer review.

Interrupted turn recovery: Tasks 2/4/6 old workers unavailable, new workers resume existing source rather than restart.
Ruling: Add optional blinkMs sampler input and eyeOpen frame value with neutral default 1 — disabling CSS blink otherwise makes animated pets never blink — if wrong, tune cadence without changing existing static art.
Browser reconnect rejected by tool policy. No browser workaround attempted. Use direct React/SVG local rendering and Resvg for visual frame review; production regression commands remain separate checks.
Initial motion-storyboard and combined wardrobe-storyboard generated directly from production React renderer and sampler; reviewed 3 species, 10 actions, 3 phases. No gross clipping/anchor drift visible in this initial sample.

Task 6: complete (commit 1dd8055, spec PASS, quality approved with minor; fresh 9-test run passed).
Task 6: minor (deferred to Task 7): label local reduced-motion control as a force override and cover live system preference.
Task 7 visual defect: dark custom body fill hides closed eyes and mouth, found in all-species color sheets. Assigned for renderer review; needs shared-face contrast treatment preserving palette/outlines and regression.
Task 4: fix round 1/5 in progress, 3 P2 findings from Carson: blocked-route validation skipped during sick/away transitions, corner facing lacks turn blend, stale pending taps survive a new celebration. Gauss resumed for regressions/fixes.
Task 2: fix round 1/5 in progress; 2 P2 findings confirmed: stance feet drift with world travel (2.6–3.2px at25px art scale) and dark fill hides shared face. Popper resumed; root coordinates sampler contract extension with behavior/travel owners.
Task 4: fix round1 implemented,107focused tests/typecheck/scopedlintPASS. Scopedre-reviewCarson underway using exactfixdiff.
Task 7 visual bounds: 10890sample firstsweep flagged15cases, confirmed chefhatpeak/Mochilowmoodarms/Bunfloppedear; added toTask2fix. Followupincludesheavyroomstrokesandcombinedoutfitallmoods.
Task 4: minor (deferred): duplicated target validation and synthetic rapidly alternating sick/sleep transition-layer churn (up to357layers), no normal-use defect demonstrated; final review must triage.

Task 4: fix round 1/5 (3 addressed,0open; independent scoped approval).
Task 4: complete (commitf940b44, fresh107focusedtestsPASS; spec/quality approved afterfix1).
Ruling: Start Task5integration against reviewed renderer architecture while Task2 stance/contrast/bounds refinements continue in disjoint character files — public rendering API stays stable and this advances room integration — if stance API changes, integration must be adjusted and re-reviewed; final acceptance waits for both.
Shared stance API draft: GroundPoint {distance,x,y}, MotionInput.groundPath and facing; unmirrored projected character SVG units, full path including past corners. Optional frame leftGroundX/Y,rightGroundX/Y defaultzero. Popperowns sampler/rig, Gausslocalroutehistory/mirroredblend, Fermattraveler. Rootcapturewalkrendersworldtranslationagainsttilegrid. Endpoint continuity explicitlyrequested.
Task 7 capture tooling: scripts/render-pet-motion.mjs generates1407sampledsheets,optional25740paddedboundscheckswithnormal/heavystrokes,andnormal/quarter-speed videos. AddedactualRoomstep/motionFor scenevideo,notalternateart. Rootownsartifactcode; finalfreshcapture pendingTask2/4/5 stabilization.

Task 4 stance followup: fix round 1/5, new P2 from Carson: collision-clamped cancellation rebases frozen feet from rejected mathematical route position. Gauss assigned focused first/later blocked-segment renderer regressions and bounded safe replant.

Task2fixround1: original2P2addressed and reactionboundsaccepted; newP2: uphill path-compensated stance feet draw below200unitbox atroomstroke. Popperassignedfixround2 preservingworldcontacts; first full25740nonpathboundspassed0flags.

Ruling: Transfer sick/away travelers immediately through the existing arrival callbacks, as reduced motion does. Sliding the whole bed or sleeping silhouette would contradict resting-pose intent. Normal travel timing stays unchanged. If wrong, suppressed-state travel needs a dedicated transition and timing revision.
Task7productionprobe: initial7cases4PASS3FAIL; first2compareddifferentRAF/eventsampletimes, thirdsampledbeforeasynchronouscompletionphase. Fermatdiagnosedwithactualclock/announcementprobes and correctedobservablepixel/phase assertions,7PASS. Initial multiroom polling sample failed its movement-count assertion. A pre-input trace recorded real movement in the next run, which passed16checks. Original cause is not proven; timing is possible. A final rerun remains required. Task5Appkeyretargetcontinuityfollowupinprogress.

Task4stancefixround1: P2NOTADDRESSED for retained corner transition layers, newclockprotectsonlylatest snapshot. Gauss assignedround2 including realistic corner-then-blocked-route reproduction. OriginalthreeP2remainclosed.

Task7continuityfinding: App retarget verification exposed unreflected static mood tilt in nonhappy upright poses. Fermatowns traveler fix/test, Gaussowns equivalent local mirror check/fix in stance round2. Both use existing pose anchor angle, no duplicated posture table.
Task7noticefinding: sick expression gating discarded the intended tiny closed-eye notice motion; Popper assigned narrow renderer/sampler regression in Task2Fix2, preserving bed/mood/reduced motion.

Task2: fix round2/5 (uphill bounds and sick notice addressed, 0 open; scoped independent approval). Original stance/contrast P2 remain closed. Complete localcommit0ccf0da after73character tests/build/type/lintPASS; root broad bounds and integrated capture remain Task7 gates.
Task5: integration implemented;30owned and482focused tests,16multiroom checks,7production probes PASS on final worker snapshot. Pascal independently reviews task5 exact74623-byte diff.

Task7 final character bounds: PASS exit0,25740action/wardrobe +16920projected-path renders,0outsidepixelsabovealpha5. Source hashes match final approvedTask2 files. 42sheets1407poses generated. `.superpowers/.../final-bounds.log` and `/tmp/chore-pet-motion-review-bounds-final/manifest.json`.

Task4stancefixround2 implemented154focusedtests/type/lintPASS, exact29363-bytediff scopedCarsonreview underway.
Task5fixround1/5: twoP2fromPascalconfirmed readable stableambientline acrossphases and nooverduewordingforclean targets. Fermatresumed focusedintegrationfix.
Task7rootfullsuite first1829PASS/1testtimeout of1830; Resvgheavybounds5233ms/5000 underconcurrentcapture+build. Popperassignedtest-onlyfontloadcostfix preservingmatrix/assertions; no assertionfailure. Rootwillrerunaftercapturesfinish. Lint andbuildPASS.

Task4stancefixround2/5: retainedcontacts/releasesP2 andnonhappyfulltorso reflectionADDRESSED; independentCarsonspec/qualityAPPROVED,newbreakage0.154focusedtests/type/lintPASS; localcommit recordedinGit.
Task2fontfollowup: KuhnAPPROVEDall60rastercases/assertionsunchanged,73charactertests/type/lintPASS,productionunchanged. Localcommit recordedinGit.
Task7finalcapture:42sheets1407poses+10normal/quarter-speedclips generatedexit0; sourcehashesmatchcurrentproduction. Saved19representativePNGs+10clips/manifest/clipsmetadata. Rootinspectedfinalwalk/travelfilmstrips/eight-roomactionframe/plantphases. Human temporalplayback remainsunverified duepolicyblock.

Task5fixround1 implemented48integration/513pet-roomtests/type/lintPASS. Pascal scopedre-review exact10973-bytefixdiff underway. Rootfreshfullsuiteisolatedfromcapturestarted; final lintPASS.

Task5fixround1/5: bothP2ADDRESSED, independentPascalAPPROVEwithnonblockingP3. Localcommit recordedinGit.
Task5minor(deferred): newclean-conditionbranch directstageindex inheritsreservedobjectIDs constructor/toString/__proto__; normalgeneratedUUIDs unaffected. Finalwholebranchreviewmusttriage.
Task7rootfinal:1848tests/82filesPASS,lintPASS,buildPASSwithchunk-sizeadvisory,45productionbrowsertestsPASSChromium152.0.7977.82. Firstfinalmultiroomattemptconnectionrefused becausepriorserverstoppedafterinterruption; no productassertionran. Restartingoffline5187 andrerunning.

Task7 finalmultiroomrerun16PASSexit0. ActualAppretargetworldjumps0, torsojoins~4.02e-14 sceneunits. Rootinspectedfreshphone3roomanddesktop6room captures. AllautomatedgatesPASS. Finalwholebranchreview pending, plushumanplaybackgate.

Task7 code/evidence committed96b185d; cleanworkingtree. Wholebranchreview range16bc0e6..96b185d dispatched with458228-bytepackage, allthree deferredminors and explicitopenhumanplaybackgate. Rootfreshalltests/build/lint/browser/multiroom/boundsPASSevidence supplied.

Finalreview agentBanach01a13110-8a3a-7800-952e-7bb0a5a3bc75 active. Root queuedconcretefinite-action endpoint/lifetimeblinkguard continuityquestion forassessment; no sourcechanges. Oncefindingsreturn useONEcombinedfixworker +ONEscopedre-review perSDD. Root codefrozen96b185d. Capturedrawlogs copied toauditdirbutglobignored; forceaddnamedunit/lint/build/browser/multiroom/boundslogs duringfinaldoccommitifpreservingGit evidence. Humanplaybackstillopen; do notclaimperfect/fullvisualacceptance.

Finalwholebranchreview COMPLETE:1P2 I1walkarrivalblink snap +4nonblockingP3 M1duplicatevalidation,M2syntheticlayers,M3reservedIDdialogue,M4auditcommands/logindex. Finitegestureblinkexplicit taperaccepted. OnecombinedfixwavewilladdressI1/M1/M3/M4.
Ruling: Defer synthetic suppression-layer consolidation, M2, because no normal-use failure is demonstrated and arbitrary truncation would risk the reviewed contact continuity. Normal taps already coalesce. If wrong, sustained externally driven mood churn consumes excess allocation and frame work until a bounded representation is implemented.

Ruling: Defer the pre-existing room-summary crash for an object ID of __proto__ with positive neglect because it is outside the animation fix diff and normal object creation uses UUIDs. If wrong, externally supplied reserved-ID data can still crash the room summary until its name map is hardened.

Final combinedfixwave: commit6b1ab20; I1/M1/M3/M4 ADDRESSED, M2formallydeferred. ExactlyONEscopedre-reviewBanach APPROVE spec/quality, no newsourcebreakage. Pre-existing roomSummary reservedIDpositive-neglect P3deferredunderRuling10.
Root freshunit1863/82filesPASS,lint/buildPASS; firstbrowser44/45withclosedChromium, isolatedfailedcase1/1PASS, fullprocess-diagnosticreplay45/45PASS withunchangedsource. Firstclosurecauseremainsunknown; allrawlogsretained. Currentcapture42sheets1407poses10clips hashesmatch; actualarrival8framePNGinspected. Multiroomfinalrunning.

Task7: code and automated evidence complete. Fresh multiroom16PASSexit0; Appretargetworldjump0, torsojoin<=8.04e-14sceneunits. Sourcefixreviewapproved and allrequestedfindingsclosed; M2andpre-existingroomSummaryminorformallydeferred. Human normal/slowplaybackacceptance remainsOPEN.
Finalevidencepreservedunder docs/audits/2026-10-11-character-animation with current sourcehashes, complete final/scopedreviews, fixreport/logs, rawintegratedlogs,19selectedmatrixsheets,2freshbrowserviews,8framearrivalstill,10clips. Worktree and offline5187devserverpreserved locally; no merge/push/PR requested. Plan-owned scratchcanbecleaned after finaldoccommit; unrelatedworkspacesuntouched.
