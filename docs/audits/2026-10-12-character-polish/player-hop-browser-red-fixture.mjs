import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp } from '/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/helpers.mjs'
test('optional player time offers a chosen Happy hop', async t => {
  const page = await browserApp(t, { viewport: { width: 320, height: 640 } })
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Happy hop', exact: true }).count(), 1)
})
