# Production browser regressions

```sh
npm ci
npx playwright-core install chromium
npm run build
npm run test:browser
```

Uses Node's test runner and the existing playwright-core dependency. On Linux CI,
`npx playwright-core install --with-deps chromium` also installs system libraries.
Set `CHROME=/absolute/path/to/chrome` to use an existing browser binary.
Use `node --test --test-concurrency=1 scripts/browser/*.test.mjs` when keeping
browser processes sequential. Node can also run under a bounded heap with
`NODE_OPTIONS=--max-old-space-size=768`.

Each test gets an isolated browser context and a production Vite preview on an
OS-assigned port. The helper reads the deployment base from dist/index.html, so
it also checks a Pages build under /chore-pet/. Finish building before starting
tests. Tests must not rebuild dist while another browser run uses it.

`browserApp(t, contextOptions)` returns a page with a sample home at 390 × 664,
reduced motion, and service workers disabled. Network access outside the local
preview is blocked so configured cloud builds use isolated device data.
`snapshot(page)` reads persisted IndexedDB state; `seedProgress(page, patch)`
loads a saved reward-threshold fixture and reloads. Tests exercise real controls,
not a development-only app interface. Add bundle-specific *.test.mjs files here.

The suite covers room shortcuts versus button activation; Undo in All chores,
gifts and behind More; keyboard focus and Escape; reward wear/place/try and queue
navigation; reduced motion and phone touch dismissal. Deliberate waits over five
seconds check that the original Undo deadline cannot remove a blocked correction.

Interactive inspection in T3 uses a separate thread-owned preview tab and port.
It does not replace this repeatable regression command. Physical-phone and other
browser-engine coverage remain manual.

The navigation bundle adds draft retention and Save/Cancel checks, screen and
sheet Back/Forward, reload/deep links, landing sign-in without a temporary home,
and stale-edit handling. Its fast React tests use jsdom through Vitest. Auth
requests are simulated in those tests; live email/Google delivery is not tested.

The wardrobe motion bundle checks finite wave/hop previews, real outfit changes,
focus, saved-data stability, live reduced motion, and phone/desktop layout. It
writes no artifacts by default. Set `CHORE_PET_CAPTURE_DIR` to an existing output
directory to save its four production screenshots and layout measurements.

The creator motion bundle checks the finite, coalesced character celebration,
stationary card, immediate face choices, actual clothing, draft/Save behavior,
keyboard focus, reduced motion, and narrow phone/landscape/desktop layout. The
same capture option saves three creator screenshots and layout measurements.
