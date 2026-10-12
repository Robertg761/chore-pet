import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

test('Enter on selected furniture focuses its customization disclosure', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await page.getByRole('group', { name: 'Your room', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  const summary = page.locator('.furniture-summary')
  assert.equal(await summary.evaluate((element) => element === document.activeElement), true)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  assert.equal(await page.getByRole('radio', { name: 'Classic style', exact: true }).evaluate((element) => element === document.activeElement), true)
})

test('an original fridge applies Honey oak on the first click and reset clears the choices', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  const fridge = Object.values((await snapshot(page)).tables.placed_objects).find((object) => object.catalogId === 'fridge')
  const drawing = page.locator(`[data-object-id="${fridge.id}"]`)
  const originalDrawing = await drawing.innerHTML()
  await drawing.click()
  await page.getByText('Customize furniture', { exact: true }).click()
  assert.equal(await page.locator('.furniture-customizer input[type="radio"]:checked').count(), 0)
  await page.getByRole('radio', { name: 'Honey oak finish', exact: true }).click()
  assert.deepEqual((await snapshot(page)).tables.placed_objects[fridge.id].appearance, { style: 'classic', finish: 'natural', fabric: 'blue', pattern: 'plain', details: true })
  assert.notEqual(await drawing.innerHTML(), originalDrawing)
  await page.getByRole('button', { name: 'Reset furniture appearance', exact: true }).click()
  assert.equal(await page.locator('.furniture-customizer input[type="radio"]:checked').count(), 0)
  assert.deepEqual((await snapshot(page)).tables.placed_objects[fridge.id], fridge)
  assert.equal(await drawing.innerHTML(), originalDrawing)
})

test('new furniture keeps its custom look and chores after reloading, and can reset', async (t) => {
  const page = await browserApp(t)
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search furniture' }).fill('armchair')
  await page.getByRole('button', { name: 'Armchair 1 chore', exact: true }).click()
  await page.getByRole('button', { name: 'Place it', exact: true }).click()
  await page.getByRole('heading', { name: 'Armchair', exact: true }).waitFor()
  const before = (await snapshot(page)).tables
  const chair = Object.values(before.placed_objects).find((o) => o.catalogId === 'armchair')
  assert.ok(chair)
  const originalDrawing = await page.locator(`[data-object-id="${chair.id}"]`).innerHTML()

  await page.getByText('Customize furniture', { exact: true }).click()
  await page.getByRole('radio', { name: 'Cottage style', exact: true }).check()
  await page.getByRole('radio', { name: 'Walnut finish', exact: true }).check()
  await page.getByRole('radio', { name: 'Rose fabric', exact: true }).check()
  await page.getByRole('radio', { name: 'Checks pattern', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Decorative details', exact: true }).uncheck()
  assert.notEqual(await page.locator(`[data-object-id="${chair.id}"]`).innerHTML(), originalDrawing)
  const appearance = { style: 'cottage', finish: 'walnut', fabric: 'rose', pattern: 'checks', details: false }
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.getByRole('heading', { name: 'Build', exact: true }).waitFor()

  const after = (await snapshot(page)).tables
  assert.deepEqual(after.placed_objects[chair.id], { ...chair, appearance })
  assert.deepEqual(after.chores, before.chores)
  assert.deepEqual(after.completions, before.completions)
  await page.locator(`[data-object-id="${chair.id}"]`).click()
  await page.getByText('Customize furniture', { exact: true }).click()
  assert.equal(await page.getByRole('radio', { name: 'Cottage style', exact: true }).isChecked(), true)
  assert.equal(await page.getByRole('radio', { name: 'Checks pattern', exact: true }).isChecked(), true)
  await page.getByRole('button', { name: 'Reset furniture appearance', exact: true }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.getByRole('heading', { name: 'Build', exact: true }).waitFor()
  assert.deepEqual((await snapshot(page)).tables.placed_objects[chair.id], chair)
})
