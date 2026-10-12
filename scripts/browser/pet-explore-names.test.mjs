import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

async function secondPlant(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, plant = Object.values(saved.tables.placed_objects).find(object => object.catalogId === 'plant')
        if (!plant) { tx.abort(); reject(new Error('sample fixture requires its existing plant')); return }
        saved.tables.placed_objects['plant-twin'] = { ...plant, id: 'plant-twin', tileX: 0, tileY: 7 }
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('fixture transaction aborted')) }
    }
  }))
  await page.reload()
}

test('native keyboard can identify and invite the second repeated furnishing', async t => {
  const page = await browserApp(t, { viewport: { width: 320, height: 640 } })
  await secondPlant(page)
  const saved = (await snapshot(page)).tables
  const toggle = page.getByRole('button', { name: 'Explore together', exact: true })
  await toggle.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab')
  const select = page.getByLabel(/^Show /)
  assert.equal(await select.evaluate(node => node === document.activeElement), true)
  assert.equal(await select.getByRole('option', { name: 'Potted plant 1', exact: true }).count(), 1)
  assert.equal(await select.getByRole('option', { name: 'Potted plant 2', exact: true }).count(), 1)
  await page.keyboard.press('End')
  assert.equal(await select.inputValue(), 'plant-twin')
  assert.equal(await select.evaluate(node => node.selectedOptions[0].text), 'Potted plant 2')
  const resident = page.locator('.room-pet'), position = await resident.getAttribute('transform')
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter')
  assert.match(await page.locator('.pet-explore [role="status"]').textContent(), /potted plant 2 from here/)
  assert.equal(await resident.getAttribute('transform'), position, 'reduced invitation keeps the resident still')
  assert.deepEqual((await snapshot(page)).tables, saved)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const out = process.env.CHORE_EXPLORE_NAMES_CAPTURE_DIR
  if (out) { await mkdir(out, { recursive: true }); await page.screenshot({ path: join(out, 'explore-second-plant-320.png') }) }
  t.diagnostic(`Chromium ${page.context().browser().version()};native keyboard;unique names;unchanged saved tables`)
})
