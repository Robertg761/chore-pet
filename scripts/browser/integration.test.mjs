import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

test('hydration reconciles the selected home rather than the most furnished home', async (t) => {
  const page = await browserApp(t)
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('kv', 'readwrite')
      const store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result
        const home = Object.values(saved.tables.homes)[0]
        const pet = Object.values(saved.tables.pets)[0]
        const room = Object.values(saved.tables.rooms)[0]
        const start = new Date()
        start.setDate(start.getDate() - 10)
        const day = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
        saved.tables.homes.selected = { ...home, id: 'selected', sample: false }
        saved.tables.pets['selected-pet'] = { ...pet, id: 'selected-pet', homeId: 'selected', name: 'Selected' }
        saved.tables.rooms['selected-room'] = { ...room, id: 'selected-room', homeId: 'selected' }
        saved.tables.chores['selected-chore'] = { id: 'selected-chore', homeId: 'selected', objectId: null, name: 'Weekly task', createdOn: day, schedule: { kind: 'weekly', weekday: start.getDay() }, photoProof: false }
        saved.tables.completions['selected-done'] = { id: 'selected-done', choreId: 'selected-chore', completedOn: day, completedAt: start.toISOString(), counts: true }
        saved.tables.progress.selected = { homeId: 'selected', choreCount: 1, currentStreak: 1, bestStreak: 1, unlockedItems: ['item:beanie-red'] }
        saved.activeHomeId = 'selected'
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.reload()
  await page.waitForFunction(() => new Promise(resolve => {
    const request = indexedDB.open('chore-pet', 1)
    request.onsuccess = () => {
      const db = request.result
      const read = db.transaction('kv').objectStore('kv').get('snapshot')
      read.onsuccess = () => { db.close(); resolve(read.result.tables.progress.selected.unlockedItems.includes('wall:lavender')) }
    }
  }))
  const saved = await snapshot(page)
  assert.equal(saved.activeHomeId, 'selected')
  assert.equal(saved.tables.progress.selected.bestStreak, 7)
  assert.ok(saved.tables.progress.selected.unlockedItems.includes('wall:lavender'))
  assert.equal(await page.locator('.gift-panel').count(), 0)
})

for (const beforeGift of [false, true]) {
  test(`Back dismisses the sheet and ${beforeGift ? 'pending' : 'visible'} gift while keeping correction reachable`, async (t) => {
    const page = await browserApp(t)
    await page.getByRole('button', { name: /All chores/ }).click()
    await page.getByRole('dialog', { name: 'All chores', exact: true }).getByRole('button', { name: 'Done: Wash the dishes' }).click()
    if (!beforeGift) await page.getByRole('button', { name: 'Open it', exact: true }).waitFor()
    await page.goBack()
    await page.getByRole('dialog', { name: 'All chores', exact: true }).waitFor({ state: 'hidden' })
    if (beforeGift) await page.waitForTimeout(1600) // exceed the delayed gift timer
    await page.locator('.gift-panel').waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).searchParams.has('sheet'), false)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await page.getByRole('button', { name: 'Done: Wash the dishes' }).waitFor()
    await page.goForward()
    await page.getByRole('dialog', { name: 'All chores', exact: true }).waitFor()
    assert.equal(await page.locator('.gift-panel').count(), 0)
    assert.ok(Object.values((await snapshot(page)).tables.progress)[0].unlockedItems.includes('item:beanie-red'))
  })
}
