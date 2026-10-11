import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp } from './helpers.mjs'

test('browser fixtures block external service URLs with nested paths', async (t) => {
  const page = await browserApp(t)
  // Remove the app's CSP so this checks the network guard itself. The reserved
  // .invalid domain makes a broken guard safe: it cannot reach a live service.
  await page.goto('about:blank')
  const url = 'https://browser-fixture.invalid/auth/v1/signup?fixture=true'
  const [request] = await Promise.all([
    page.waitForEvent('requestfailed', { predicate: request => request.url() === url }),
    page.evaluate(url => fetch(url).catch(() => null), url),
  ])
  assert.equal(request.failure().errorText, 'net::ERR_FAILED')
})
