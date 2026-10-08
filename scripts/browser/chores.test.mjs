import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

// Names on the list today: removed (archived) rows don't count.
const onList = async (page) => Object.values((await snapshot(page)).tables.chores).filter((c) => !c.archivedOn).map((c) => c.name).sort()

async function addChore(page, name) {
  await page.getByRole('button', { name: 'Add a chore', exact: true }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
}

async function removeTrash(page) {
  // A short phone's home list may not reach it, so open it from the full list.
  await page.getByRole('button', { name: /All chores/ }).click()
  await page.getByRole('dialog', { name: 'All chores', exact: true }).getByRole('button', { name: 'Edit Take out the trash' }).click()
  await page.getByRole('button', { name: 'Remove chore' }).click()
  // The question names the chore: on a phone the form is hidden behind it.
  await page.getByText('Remove "Take out the trash"? Your past work and rewards stay.').waitFor()
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
}

test('adding a chore says so, and Undo takes it back', async (t) => {
  const page = await browserApp(t)
  const before = await onList(page)
  await addChore(page, 'Water the herbs')
  await page.getByText('Added: Water the herbs').waitFor()
  // Back home, focus starts at the home heading rather than nowhere.
  await page.waitForFunction(() => document.activeElement === document.querySelector('.app-view h1'))
  assert.deepEqual(await onList(page), [...before, 'Water the herbs'].sort())

  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.waitForFunction(() => !document.body.textContent.includes('Added: Water the herbs'))
  assert.deepEqual(await onList(page), before)
})

test('removing a chore says so, and Undo brings it back', async (t) => {
  const page = await browserApp(t)
  const before = await onList(page)
  await removeTrash(page)
  await page.getByText('Removed: Take out the trash').waitFor()
  assert.deepEqual(await onList(page), before.filter((n) => n !== 'Take out the trash'))

  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.waitForFunction(() => !document.body.textContent.includes('Removed: Take out the trash'))
  assert.deepEqual(await onList(page), before)
})

test('editing a chore gives no toast', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: /All chores/ }).click()
  await page.getByRole('dialog', { name: 'All chores', exact: true }).getByRole('button', { name: 'Edit Take out the trash' }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Take out the bins')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
  assert.equal(await page.getByRole('status').filter({ hasText: /Added|Removed/ }).count(), 0)
  assert.ok((await onList(page)).includes('Take out the bins'))
})

test('Cancel from the editor puts focus on the home heading', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Add a chore', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
  await page.waitForFunction(() => document.activeElement === document.querySelector('.app-view h1'))
  await page.getByRole('button', { name: 'Add a chore', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('heading', { name: 'Mochi', exact: true }).waitFor()
  await page.waitForFunction(() => document.activeElement === document.querySelector('.app-view h1'))
})
