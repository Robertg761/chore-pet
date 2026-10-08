import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

const tables = async (page) => (await snapshot(page)).tables
const rooms = async (page) => Object.values((await tables(page)).rooms)

async function addBathroomWithToilet(page) {
  await page.getByRole('button', { name: /^Rooms: Kitchen/ }).click()
  await page.getByRole('button', { name: 'Add a bathroom', exact: true }).click()
  // A new room opens in Build.
  await page.getByRole('button', { name: /^Rooms: Bathroom/ }).waitFor()
  await page.getByRole('button', { name: /^Toilet/ }).click()
  await page.getByRole('button', { name: 'Place it', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('[data-object-id]').length === 1)
}

test('a second room gets its own furniture and chores, and the kitchen keeps its own', async (t) => {
  const page = await browserApp(t)
  const kitchenThings = Object.keys((await tables(page)).placed_objects).length
  await addBathroomWithToilet(page)

  const all = await rooms(page)
  assert.equal(all.length, 2)
  const bathroom = all.find((r) => r.type === 'bathroom')
  const objects = Object.values((await tables(page)).placed_objects)
  assert.equal(objects.filter((o) => o.roomId === bathroom.id).length, 1)
  assert.equal(objects.length, kitchenThings + 1)
  const toilet = objects.find((o) => o.roomId === bathroom.id)
  assert.ok(Object.values((await tables(page)).chores).some((c) => c.objectId === toilet.id), 'the toilet brought its chore')

  // Back to the kitchen from the pill; its late chores never left the list.
  await page.getByRole('button', { name: /^Rooms: Bathroom/ }).click()
  await page.getByRole('button', { name: /^Show the kitchen/ }).click()
  await page.getByRole('button', { name: /^Rooms: Kitchen/ }).waitFor()
  assert.equal(await page.locator('[data-object-id]').count(), kitchenThings)
})

test('the pill counts late chores in the other rooms', async (t) => {
  const page = await browserApp(t)
  await addBathroomWithToilet(page)
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  // The sample kitchen has two late chores.
  await page.getByRole('button', { name: 'Rooms: Bathroom. 2 chores late in other rooms' }).waitFor()
})

test('removing a room asks first, then archives its chores', async (t) => {
  const page = await browserApp(t)
  await addBathroomWithToilet(page)
  await page.getByRole('button', { name: /^Rooms: Bathroom/ }).click()
  await page.getByRole('button', { name: 'Remove the bathroom', exact: true }).click()
  // The safe choice has focus.
  assert.equal(await page.locator(':focus').textContent(), 'Keep it')
  await page.getByRole('group', { name: 'Remove the bathroom' }).getByRole('button', { name: 'Remove', exact: true }).click()
  // The room on show is gone, so the pill falls back to the kitchen.
  await page.getByRole('button', { name: /^Rooms: Kitchen/ }).waitFor()
  const after = await tables(page)
  assert.deepEqual(Object.values(after.rooms).map((r) => r.type), ['kitchen'])
  const toiletChores = Object.values(after.chores).filter((c) => c.name === 'Clean the toilet')
  assert.ok(toiletChores.length > 0 && toiletChores.every((c) => c.archivedOn && c.objectId === null))
  // With one room left there's nothing to remove.
  assert.equal(await page.getByRole('button', { name: /^Remove the/ }).count(), 0)
})
