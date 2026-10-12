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

async function instrument(page) {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__exploreFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__exploreFrames.delete(id); callback(now) })
      window.__exploreFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__exploreFrames.delete(id); cancel(id) }
  })
  await page.reload()
  await page.locator('.room-pet').waitFor()
}

async function assertTwinMarker(page) {
  const marker = page.locator('.room-selection[data-selection-object="plant-twin"]')
  assert.equal(await marker.count(), 1, 'the selected second plant must have its own room marker')
  assert.equal(await marker.getAttribute('aria-hidden'), 'true')
  assert.equal(await marker.evaluate(node => getComputedStyle(node).pointerEvents), 'none')
  assert.equal(await marker.evaluate(node => node.getAnimations({ subtree: true }).length), 0)
  assert.equal(await marker.locator('polygon').first().getAttribute('points'), '46.25,204.38 67.5,215 46.25,225.63 25,215')
}

test('native keyboard can identify and invite the second repeated furnishing', async t => {
  const page = await browserApp(t, { viewport: { width: 320, height: 640 } })
  await secondPlant(page)
  await instrument(page)
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
  await assertTwinMarker(page)
  assert.equal(await page.evaluate(() => window.__exploreFrames.size), 0)
  const resident = page.locator('.room-pet'), position = await resident.getAttribute('transform')
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter')
  assert.match(await page.locator('.pet-explore [role="status"]').textContent(), /potted plant 2 from here/)
  assert.equal(await resident.getAttribute('transform'), position, 'reduced invitation keeps the resident still')
  assert.deepEqual((await snapshot(page)).tables, saved)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const out = process.env.CHORE_EXPLORE_NAMES_CAPTURE_DIR
  if (out) { await mkdir(out, { recursive: true }); await page.screenshot({ path: join(out, 'explore-second-plant-320.png') }) }
  const marker = page.locator('.room-selection[data-selection-object="plant-twin"]')
  await marker.scrollIntoViewIfNeeded()
  // SVG geometry bounds omit the stroke; leave breathing room above the arrow.
  const scrollTarget = await page.evaluate(() => ({
    innerAtOldPoint: Boolean(document.elementFromPoint(160, 100)?.closest('.home-scene-viewport')),
    innerAtOuterPoint: Boolean(document.elementFromPoint(300, 200)?.closest('.home-scene-viewport')),
  }))
  t.diagnostic(`Phone scroll targets:${JSON.stringify(scrollTarget)}`)
  assert.equal(scrollTarget.innerAtOuterPoint, false, 'scroll outside the scene, whose overscroll is contained')
  await page.mouse.move(300, 200)
  await page.mouse.wheel(0, -80)
  await page.waitForFunction(() => document.querySelector('.room-selection').getBoundingClientRect().top >= 16)
  const bounds = await marker.boundingBox()
  assert.ok(bounds.y >= 16 && bounds.y + bounds.height <= 624, 'the phone can show the entire stationary marker with its outline clear of viewport edges')
  assert.equal(await page.evaluate(() => window.__exploreFrames.size), 0)
  if (out) await page.screenshot({ path: join(out, 'explore-second-plant-marker-320.png') })
  await toggle.click()
  assert.equal(await page.locator('.room-selection').count(), 0)
  assert.equal(await page.evaluate(() => window.__exploreFrames.size), 0)
  t.diagnostic(`Chromium ${page.context().browser().version()};native keyboard;unique names;unchanged saved tables`)
})

test('native furnishing previews preserve the current fractional walk and its one pending frame', async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } })
  await secondPlant(page)
  await instrument(page)
  const saved = (await snapshot(page)).tables
  const resident = page.locator('.room-pet')
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  const start = await resident.getAttribute('transform')
  let moved = false
  for (let i = 0; i < 100; i++) {
    await page.clock.runFor(32)
    if (await resident.getAttribute('transform') !== start) { moved = true; break }
  }
  assert.equal(moved, true, 'the fixture must reach a genuine moving step')
  await resident.evaluate(node => { window.__previewPet = node })
  const before = await resident.evaluate(node => ({ at: node.getAttribute('transform'), body: node.querySelector('[data-character-body]').outerHTML }))
  const pending = await page.evaluate(() => [...window.__exploreFrames])
  assert.equal(pending.length, 1)
  await page.getByLabel(/^Show /).focus()
  await page.keyboard.press('End')
  await assertTwinMarker(page)
  assert.equal(await resident.evaluate(node => node === window.__previewPet), true)
  assert.deepEqual(await resident.evaluate(node => ({ at: node.getAttribute('transform'), body: node.querySelector('[data-character-body]').outerHTML })), before)
  assert.deepEqual(await page.evaluate(() => [...window.__exploreFrames]), pending)
  const out = process.env.CHORE_EXPLORE_NAMES_CAPTURE_DIR
  if (out) { await mkdir(out, { recursive: true }); await page.screenshot({ path: join(out, 'explore-preview-walk-1280.png') }) }
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  assert.equal(await page.locator('.room-selection').count(), 0)
  assert.deepEqual(await page.evaluate(() => [...window.__exploreFrames]), pending)
  assert.deepEqual((await snapshot(page)).tables, saved)
})
