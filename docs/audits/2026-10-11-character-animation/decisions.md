# Decisions and costs

Ruling: Allow parallel implementation only for disjoint file sets in Tasks 1 and 3, as the approved plan describes — avoids shared-state editing conflicts and saves time — if wrong, integration requires rework.

Ruling: Controller owns Git commits because the worktree Git index is outside the writable sandbox — workers report exact changed paths without staging — if wrong, commit attribution differs but source review remains available.

Ruling: Start Task 5 clock implementation alongside disjoint Tasks 1/3 — hook has no sampler/renderer dependency — if wrong, defer its integration until dependency reviews pass.

Ruling: Extract existing pathfinding into a pure pet/pathfinding.ts if needed when Task 4 consumes chooseInteraction — avoids a runtime cycle without duplicating route selection — if wrong, adds one small file and re-export compatibility.

Ruling: Develop Task 6 review panel against the stable AnimatedCharacterArt interface while Task 2 finishes — disjoint dev files and deterministic public sampler — if wrong, adjust panel integration after renderer review.

Ruling: Add optional blinkMs sampler input and eyeOpen frame value with neutral default 1 — disabling CSS blink otherwise makes animated pets never blink — if wrong, tune cadence without changing existing static art.

Ruling: Start Task5integration against reviewed renderer architecture while Task2 stance/contrast/bounds refinements continue in disjoint character files — public rendering API stays stable and this advances room integration — if stance API changes, integration must be adjusted and re-reviewed; final acceptance waits for both.

Ruling: Transfer sick/away travelers immediately through the existing arrival callbacks, as reduced motion does. Sliding the whole bed or sleeping silhouette would contradict resting-pose intent. Normal travel timing stays unchanged. If wrong, suppressed-state travel needs a dedicated transition and timing revision.
