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
