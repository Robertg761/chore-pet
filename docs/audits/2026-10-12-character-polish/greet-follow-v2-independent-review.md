# Batch53 resource supervisor correction independent revision review

The correction closes the original P2. Live owned-group cleanup now proceeds independently of the leader, and the recorded disposable-tree evidence exercises both leader termination and normal leader exit with a stubborn descendant. The bounded revision is acceptable. No critical, important or minor actionable findings remain within this scope.

This is one independent review against the requesting-code-review criteria: requirements, correctness, maintainability, integration, meaningful regression evidence and readiness. I read the original `greet-follow-independent-review.md`, which accepted the greeting source/art evidence and requested only the supervisor correction. I performed read-only source, hash and arithmetic inspection and authored only this report. I ran no tests, builds, browsers, captures, comparison runners or probes, spawned no agents and sent no messages. I did not open or visually inspect the PNGs. The original review's eighteen-still inspection remains that reviewer's evidence.

| Identity | Independently verified value |
| --- | --- |
| Immutable revision input | `greet-follow-v2-review-input.json` |
| Revision input SHA256 | `b352d714e3155c20e0d0a923868eb867ebee2e8cb48edcff323fdd759f4d5144` |
| Base and current HEAD | `d4e6f2098939d86945dbc424d615bf829315df35` |
| Original input SHA256 | `de59ff1573495ca1e9e7a98311f176202dff16577b9534388e43a2682840f6e3` |
| Original review SHA256 | `325f1d6d6dd65fd9d6850c9f991f242c30d3a0d83a67af6ba9ca18866069133a` |
| Unchanged source patch SHA256 | `5e22c78d22a6f581da3ca890e1f89ff6238ffbcef2841b0bf1fa1c9c73f1f4e3` |
| Original 72-artifact manifest SHA256 | `2e66698b1bfc38c2999c1b5032a8feb13bf707f7767e2ee9287d5b52aa09c2a3` |
| Extended 82-artifact manifest SHA256 | `964f10815cfeb60b41cf2fcd706c6b1d77a63f7d6f51e7d97c151dedad65d90a` |
| Archived/current v2 resource runner SHA256 | `43416218ab8099affaead61557d0461a77c05c22105c31ef9bddc812c72b016a` |

All 7 authored and 36 unchanged source hashes match the revision input and the original freeze. All 36 unchanged sources also equal their base Git bytes. Applying the exact frozen patch in memory reconstructs all 7 authored files, including 5 new files, byte for byte. Every original artifact retains its path and digest within the extended manifest; all 82 artifact hashes match disk. The extension adds 7 correction/probe artifacts and 3 original input/verification/review records. All 23 raw log hashes, exit-file hashes and exit values match, with the original 20 check entries unchanged and 3 disposable-tree records added. The v2 verification document equals the immutable input apart from its additional matching input-reference field.

The archived v2 runner is byte-identical to `/tmp/chore-pet-resource-check.py`. The archived tree probe and leader also equal their current `/tmp/chore-pet-tree-probe.py` and `/tmp/chore-pet-tree-leader.py` counterparts. This establishes current byte identity, not fresh execution or independent historical execution attestation.

The repair directly addresses the original failure. [The membership scan at line 31](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/greet-follow-v2-resource-runner.py.txt:31) parses `/proc/<pid>/stat` after the final closing parenthesis and uses the correct state, process-group and session fields. A member must have both PGID and session ID equal to the launched child's PID and must not be `Z` or `X`. Disappearing processes are tolerated. The separate session established at line 74 supplies the ownership boundary; signalling uses only `os.killpg(child.pid, ...)`. There is no command-name search, system-wide signal or signalling of a parent group. Descendants that deliberately leave this group/session are outside this cleanup boundary.

[Cleanup at line 91](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/greet-follow-v2-resource-runner.py.txt:91) checks membership whenever a child was launched, including after `poll()` has observed and reaped an exited leader. It sends TERM when live members exist, checks the group for 3 seconds, then sends KILL if live survivors remain. It waits up to 2 further seconds for live members to end and records the remaining set. The leader is reaped separately with a 2-second wait at line 111. Leader exit can no longer satisfy the group-survival check. An otherwise completed child with surviving descendants produces supervisor exit 126; a remaining live group after escalation selects 127. An interrupted supervisor retains its signal-derived exit when cleanup succeeds.

[Lines 88 and 89](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/greet-follow-v2-resource-runner.py.txt:88) replace the TERM/INT exception handlers with `SIG_IGN` before membership inspection. This prevents subsequent handled signals from interrupting the bounded cleanup and subsequent sidecar writes. These signals are discarded rather than queued for later delivery. No subprocess is launched after this change, so the demonstrated worker inherited its disposition before cleanup masking. The first signal reason, cleanup membership and separate leader result remain available to the final log, exit file and resource JSON. This is appropriate for the short-lived supervisor and does not establish protection against every signal or exceptional failure.

The probe uses a real spawned leader and descendant. [The worker source at line 4](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/greet-follow-v2-tree-leader.py.txt:4) installs `SIGTERM` ignore before publishing its PID, then sleeps. The leader either stays alive or exits 0 after readiness. [The driver at line 9](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/greet-follow-v2-tree-probe.py.txt:9) waits for readiness, sends TERM only in the interruption case, and checks supervisor status, sidecar status, stubborn-worker escalation and the final absence of live work. Its recorded process-state assertion accepts only absence or `Z`/`X`. Its fallback worker signal requires the unique owned PID-file marker in that process's command line. I inspected these assertions without executing them.

| Recorded path | Owned PGID | TERM members | KILL members | Leader result | Supervisor exit | Remaining live |
| --- | ---: | --- | --- | ---: | ---: | --- |
| Supervisor SIGTERM | 5047 | 5047, 5048 | 5048 | -15 | 143 | Empty |
| Normal leader exit | 5158 | 5159 | 5159 | 0 | 126 | Empty |
| Outer driver | 5042 | Empty | Empty | 0 | 0 | Empty |

Both case records exactly match their resource-sidecar cleanup objects and sidecar digests. Both `killMembers` sets include the published stubborn worker. The three bound raw log/exit pairs agree with these results, and the outer log records both case results before its success line. These are meaningful recorded regressions for the original P2, rather than another single-sleeper check. Sidecars are present for all three paths.

I recomputed resource facts from the bound sample arrays rather than copying printed rounded minima.

| New record | Samples | Last elapsed seconds | Minimum available RAM, MiB | Minimum `/tmp` free, MiB |
| --- | ---: | ---: | ---: | ---: |
| Tree TERM | 3 | 3.154 | 5079.83984375 | 4091.34375 |
| Tree leader exit | 3 | 4.085 | 5056.4921875 | 4091.34375 |
| Tree driver | 10 | 8.021 | 5052.734375 | 4091.34375 |

All three have 3200 MiB launch thresholds, 2048 MiB run reserves and recorded `NODE_OPTIONS=--max-old-space-size=192`. Their initial and later samples satisfy the recorded memory/tmp thresholds. Neither nonzero case represents a reserve stop or launch rejection. The elapsed values support the recorded executions; they do not independently timestamp TERM-to-KILL delivery.

The unchanged original resource summary still covers 19 records and 271 samples. Every record digest, per-record minimum, count, exit and reason matches. Its observed RAM minimum remains 3079.08984375 MiB and `/tmp` minimum 4007.99609375 MiB, with zero reserve stops, zero launch rejections, one intentional signal probe and one unobserved interrupted run. Adding this revision's 3 records gives 22 resource records and 287 sample rows, with unchanged overall minima. The new supervisor-TERM case adds one intentional signal probe; the 126 case records survivor detection after normal leader exit. Nested and outer samples overlap, so these counts are evidence rows, not independent jobs or continuous coverage.

No product motion bytes changed in this revision. The previously recorded 2395 unit tests in 125 files, 32 native tests, production `tsc -b && vite build`, scoped lint and source whitespace results remain prior results. The build's existing chunk-size advisory remains recorded. Both retained differential records still bind to the same sources and runner. Their arithmetic agrees: `3 × 5 × 16 × 3 × 2 × 2 × 15 = 43,200`, comprising 42,408 exact frames and 792 permitted appendage-only changes, 264 per species. I verified the records and bindings without rerunning either comparison or reopening the original visual review.

The original interrupted full run still has unknown cause and no final supervisor resource sidecar or completed suite result. Its tool-observed 143 does not establish a resource stop. The initial observation digest `929cc863607ae0010e3de7884e3a3e12466e2d043131bf691404467235599602` matches exactly the first 875 bytes of the separately frozen 8920-byte partial log, whose full digest is `82c562c76e16d04730f6902764bd421c6fca06f1fa7e6e23c1b0b5f780a6b695`. The recorded history describes the orphan writer continuing before owned-group cleanup. The two hashes describe different stages of that partial log; neither supplies missing termination cause or resource minima.

Behaviors declined for judgment, with reasons:

- Wardrobe-rename draft, prototypes and tests belong to the explicitly excluded next batch and postdate the recorded full suite. Production [Wardrobe.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/Wardrobe.tsx) and [Wardrobe.css](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/Wardrobe.css) remain byte-exact to their frozen/base hashes. The 2395-test result makes no claim about the new tests.
- Renewed greeting visual acceptance, human temporal comfort and unrecorded phase/outfit/browser/device coverage are outside this correction review. The original acceptance is retained through unchanged identity, not a new visual inspection.
- Universal detachment, signal and resource-path certification exceeds the static review and two recorded probe paths. New sessions/groups, launch-time signal races, SIGINT, repeated signals during cleanup and reserve-stop behavior were not exercised by these probes.
- Unconditional sidecar persistence is not established. The separate `child.wait(timeout=2)` can still raise if the leader cannot be reaped within that interval, and `/proc` or file operations can fail. The two demonstrated paths preserve sidecars; this review does not certify kernel-stuck processes or exceptional I/O paths.
- Peak or continuous host safety, per-process CPU/RSS and whole-job heap enforcement are not established by approximate host snapshots and a recorded environment string. No interrupted-run minima are inferred.

Ready to accept this revision. The leader-independent membership checks and stubborn-descendant evidence satisfy the original P2 without changing the accepted greeting implementation or its frozen evidence. No further correction is required for this bounded acceptance.

PASS
