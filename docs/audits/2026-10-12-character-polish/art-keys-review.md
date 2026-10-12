Independent read-only review for Chore Pet batch13, 2026-10-12.

**Approve.** No actionable correctness, regression, or coverage findings in the frozen `art-keys.diff`. This approval covers the three-file patch and the static evidence described below. It does not certify root command exits or human temporal acceptance.

The review base resolves to `9a7bcaa99e25ef3efc7638c4058bd74df5d0def0`. I checked source, callers, local dependency code, supplied logs, and audit JSON sequentially. I ran only lightweight reads and in-memory hash/patch comparisons. I did not run tests, builds, lint, browsers, the audit helper, Git mutations, or agents. My only write is this report.

The frozen patch is 3,971 bytes and contains exactly `counter.tsx`, `diningTable.tsx`, and the new 46-line `keys.test.tsx`. Every postimage matches the current file's full Git blob hash and every hunk matches current bytes. Reversing the patch in memory reconstructs both art files byte-for-byte at the review base. The test is absent at that base. Both reconstructed preimages also match the before-audit SHA-256 records.

The production correction is four string changes. Counter bowls receive `bowl-a`, `bowl-b`, and `bowl-c`; the dining-table bowl receives `bowl-b`. `tableware.tsx:25-31` passes the fifth argument only to the returned group's React key. `mess.tsx:9-26` passes the fly's third argument to its group key. These groups are direct siblings in the affected `messy2` drawings, so the original bowl keys collide with the flies' `a`/`b`/`c` keys on the counter and `b` on the dining table. The replacement keys are unique within those sibling groups and stable across renders.

The patch changes no coordinates, paths, colors, transforms, helper behavior, drawing order, bounds, footprints, or cue positions. `Room.tsx:84-92` renders each object's art inside its own placement group, and `Room.tsx:193-195` keys placements by object ID. Reusing `bowl-b` in different objects therefore introduces no cross-object collision. No production state, timing, or persistence code changes.

The test exercises the actual catalog and art registry through the shared `createRoot`/`act` client helper. The current catalog has 24 distinct IDs. Each case starts clean and rerenders through `clean → messy1 → messy2 → clean → messy2 → messy1 → clean`, covering all six directed transitions between distinct stages. Each result is compared with a separately generated SSR drawing for its destination stage. The recursive comparison preserves element tags, every attribute name/value, child order, and text, while sorting attribute names to avoid serialization-order differences. This checks reconciliation against a fresh drawing rather than merely counting shapes.

The console spy collects only messages containing React's duplicate-key diagnostic and forwards every other error to the saved original function. Static inspection of the installed React DOM 19.3.0 development implementation confirms that diagnostic text. The `finally` block unmounts the client root and restores the spy after the transition assertions. The test uses the current artwork as its SSR reference, so it is a reconciliation regression check, not an independent historical artwork snapshot.

The supplied red log reports exactly two failing cases and 22 passing cases. Counter fails on six duplicate warnings, corresponding to `a`, `b`, and `c` on its two messy2 visits; dining-table fails on two `b` warnings. Both failures reach the final warning assertion after the drawing comparisons. This evidence supports removal of unsupported sibling identity collisions; it does not demonstrate an existing dropped/duplicated-shape symptom. The supplied focused green log reports 28 passing tests across `keys.test.tsx` and the four `App.navigation.test.tsx` cases. These are inspected historical results, not tests independently rerun by this reviewer. The logs alone do not establish captured shell exit metadata.

I inspected `hash-object-art.mjs` statically. It loads the actual source art registry and catalog through Vite SSR, renders `<svg>` with each art's `render(stage)`, and hashes the exact markup string with SHA-256. It records UTF-8 byte lengths without normalizing geometry, attributes, or child order. React keys are absent from serialized markup. The helper does not substitute fixtures or compute its drawing hashes from the test's comparison function.

Both JSON files contain exactly the current 24 catalog IDs crossed with `clean`, `messy1`, and `messy2`. All 72 drawing records have identical SHA-256 values and byte counts before and after, totaling 516,292 serialized bytes. Their 38-entry source manifests cover every immediate `.ts`/`.tsx` file in `src/room/objects` plus the audit helper. Every after-manifest hash matches current bytes. Every before-manifest hash matches current bytes except the two art files, which match the reconstructed base preimages. Only those two manifest entries differ. The before manifest already includes the new test, so it represents the pre-key-correction working tree rather than the complete review-base tree.

The following SHA-256 values bind the reviewed patch, changed sources, and supplied evidence. Audit filenames are under `docs/audits/2026-10-12-character-polish/`.

| File | SHA-256 |
| --- | --- |
| `art-keys.diff` | `34c6cc9d4570ac350fc3f1322f2c5ad9ba55307d354899f3e14da8dc9fcd451d` |
| `src/room/objects/counter.tsx` | `6a17ccda803d04de3bc52448d832602c86b271b63031f55dc3ddaf35810b281c` |
| `src/room/objects/diningTable.tsx` | `9d0968046afdce17e0983905aefaf305ffcc029e771bc0a46b0aab28542e987c` |
| `src/room/objects/keys.test.tsx` | `16dbc0d69481540cb2917230276c5d6933f8e0fa617f03d3281d37d39bf6447d` |
| `hash-object-art.mjs` | `3abfa795828fc80bf193f4d6fc74fb77903d12d4e7d24ea9d4a84cbbd2310d8d` |
| `art-keys-before.json` | `5435b855d0cd28de1142129fca02339bcad37a13bccd05d62a50c3343f0371ad` |
| `art-keys-after.json` | `a8fd13984ac242470c72a42b7ddfe43ac281983af7216dec87bfa343980e7287` |
| `art-keys-red.log` | `94bfe6eb3dfab09de5ed79d0c2384591161b4fa12995823fe4783f6cd96346fc` |
| `art-keys-green.log` | `53fa9fd4fea53432b52dd0e698aecf8c7ed7d1f486a9b22571e68222bd65b5f1` |

Additional current source hashes bind the inspected helpers and callers. These are reviewer measurements of current bytes, not retroactive additions to the audit manifests.

| File | SHA-256 |
| --- | --- |
| `src/room/objects/tableware.tsx` | `953797710131f3ca9340abe6fa9302fb023315e8ef425420f33d1b53f60e1f3c` |
| `src/room/objects/mess.tsx` | `490389adab426507fcbc3a1b09612471e6df49bf76dfd9092bb9fa6afc6a8dc5` |
| `src/room/objects/index.ts` | `b74c1948c79bba2c75568a84be517e0255d1bd124553197d10da191d15617e6f` |
| `src/catalog/objects.ts` | `a6303975a308be32de69f8ac6ac2376903aa1e3947a3f9fa354354097b3cfc6d` |
| `src/test/react.tsx` | `f5725f11c6aba9d7dfb50899dc7653b4941dbcfe718f49d59ab46657a06af352` |
| `src/room/Room.tsx` | `10e3faba9fe3419d4b88427d55a0468da6e39c402c7ed3cbee0338d258137a8a` |
| `src/App.navigation.test.tsx` | `b3feda82e0367d9e470fe00edc7d248da4c783e8f8be180569029ceb2f1277a1` |
| `package-lock.json` | `596d8a0708376644b5990f28eed63fbb817f4653ee7c2a80155e37df9c53c884` |

Limits remain explicit:

- I independently compared the recorded drawing hashes and their source bindings; I did not regenerate SVG output. The JSON retains hashes and sizes, not raw SVG strings.
- The audit manifests omit transitive inputs outside the object directory, including palette/color/isometric helpers, the catalog, package versions, Vite configuration, and environment settings. The helper uses source SSR without explicitly selecting production mode. Its evidence supports exact recorded source-art markup identity, not a separately attested compiled production bundle or a fully reproducible capture environment. Installed packages currently report React/React DOM 19.3.0, Vite 8.3.3, Vitest 5.0.3, and jsdom 26.1.0.
- The jsdom tests cover drawing-tree reconciliation and duplicate-key warnings. They do not establish browser layout, hydration, animation timing, human visual acceptance, direct dirty initial mounts, or repeated same-dirty-stage updates. Unrelated console errors remain visible but are not independently asserted to fail these cases.
- Root build, lint, and full-suite verification remain outside this review and were pending in the request. I certify no root exits and no human temporal acceptance.
