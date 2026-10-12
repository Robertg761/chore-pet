# Continuing character polish

User instruction: keep improving visuals and adding features until plan usage runs out, without exceeding system resources. This is continuing authorized local work. The prior animation design remains the visual baseline; no furniture redesign, dependencies, persistence migrations, publication, or changes to the user's browser session are planned.

The account initially reported 7% of the plan window used. Resource baseline: 32 GB RAM, about 5.7 GB available, 12 CPUs, load about 8.5, and 4.1 GB free on /tmp. Heavy checks run one at a time, unit tests use one worker, Node gets a 768 MB heap cap, and subprocesses run at lower scheduling priority. Recheck before heavy work. Avoid bulk frame capture. If available RAM falls below 3 GB or temporary storage below 2 GB, defer heavy work until headroom recovers. No unrelated files or processes will be cleaned up.

First bounded batch: close the previously disclosed reserved-ID room-summary crash; make the motion panel use the production room stroke scale, add mirrored facing review and exact 16 ms frame stepping, and support looping playback without extra clocks. Preserve reduced-motion authority and local-only settings. Cover observable behavior with focused red/green tests, then the full suite with one worker, typecheck/lint, and independent review. Next investigate a quiet idle player-attention cue on the existing room clock.

Human temporal playback acceptance from the earlier review remains open after the tool-policy browser access rejection. Isolated regression browsers and production SVG frame inspection remain separate permitted verification methods; no reconnect or workaround is planned.

Batch 1 implemented. Red: five expected failures, including the reserved-ID crash and absent controls. Focused green: 21 tests pass. Full suite: 1,870 tests in 82 files pass with one concurrent worker and 768 MB Node heap cap, 56.60 seconds. Build/typecheck and lint pass; build keeps the existing chunk-size advisory. Source diff is batch-1.diff. Resource headroom after unit checks remained about 5 GB. Independent review pending. No new runtime clock, dependency, persistence, or furniture changes.
