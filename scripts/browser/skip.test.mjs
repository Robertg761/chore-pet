import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

const trash = async (page) => Object.values((await snapshot(page)).tables.chores).find((c) => c.name === 'Take out the trash')

async function skipTrash(page) {
  // A short phone's home list may not reach it, so open it from the full list.
  await page.getByRole('button', { name: /All chores/ }).click()
  await page.getByRole('dialog', { name: 'All chores', exact: true }).getByRole('button', { name: 'Edit Take out the trash' }).click()
  await page.getByRole('button', { name: 'Skip this time', exact: true }).click()
  // Back home, the toast says what happened.
  await page.getByText('Skipped: Take out the trash').waitFor()
}

test('Skip this time settles a late chore without a completion', async (t) => {
  const page = await browserApp(t)
  const before = await snapshot(page)
  await skipTrash(page)
  assert.equal((await trash(page)).schedule.skips?.length, 1)
  assert.deepEqual((await snapshot(page)).tables.completions, before.tables.completions, 'a skip records no completion')

  // Once the toast has gone, the full list reads "Skipped" with nothing to tap.
  await page.getByText('Skipped: Take out the trash').waitFor({ state: 'hidden', timeout: 8000 })
  await page.getByRole('button', { name: /All chores/ }).click()
  const sheet = page.getByRole('dialog', { name: 'All chores', exact: true })
  await sheet.getByText('Skipped', { exact: true }).waitFor()
  assert.equal(await sheet.getByRole('button', { name: 'Done: Take out the trash' }).count(), 0)
})

test('Undo takes a skip back', async (t) => {
  const page = await browserApp(t)
  await skipTrash(page)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.waitForFunction(() => !document.body.textContent.includes('Skipped: Take out the trash'))
  assert.equal((await trash(page)).schedule.skips, undefined)
  await page.getByRole('button', { name: /All chores/ }).click()
  await page.getByRole('dialog', { name: 'All chores', exact: true }).getByRole('button', { name: 'Done: Take out the trash' }).waitFor()
})

test('Skip is offered only while a round is owed', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: /All chores/ }).click()
  const sheet = page.getByRole('dialog', { name: 'All chores', exact: true })
  // "Clear out old food" isn't due yet in the sample home.
  await sheet.getByRole('button', { name: 'Edit Clear out old food' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Skip this time' }).count(), 0)
})

test('the home shows the streak once a day counts', async (t) => {
  const page = await browserApp(t)
  // Seeded sample history isn't the player's, so there's no streak yet.
  assert.equal(await page.locator('.hb-streak').count(), 0)
  await page.getByRole('button', { name: 'Done: Wash the dishes' }).click()
  await page.getByRole('button', { name: 'Open it', exact: true }).click()
  await page.getByRole('button', { name: 'Put it on' }).click()
  await page.locator('.hb-streak', { hasText: '1 day' }).waitFor()
})
