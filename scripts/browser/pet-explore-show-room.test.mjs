import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

const visible = node => {
  const box = node.getBoundingClientRect()
  let left = 0, top = 0, right = innerWidth, bottom = innerHeight
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent), clip = parent.getBoundingClientRect()
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, clip.left + parent.clientLeft); right = Math.min(right, clip.left + parent.clientLeft + parent.clientWidth) }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, clip.top + parent.clientTop); bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight) }
  }
  return Math.max(0, Math.min(right, box.right) - Math.max(left, box.left)) * Math.max(0, Math.min(bottom, box.bottom) - Math.max(top, box.top)) / (box.width * box.height)
}

for (const { width, height, text = 1, reduced = true } of [
  { width: 320, height: 640 }, { width: 320, height: 640, text: 2 },
  { width: 390, height: 664, reduced: false },
  { width: 844, height: 390 }, { width: 844, height: 390, text: 2 },
  { width: 1280, height: 800, reduced: false }, { width: 1280, height: 800, text: 2 },
]) test(`Explore views the selected room at${width}x${height}/${text * 100}% text without another invitation`, async t => {
  const page = await browserApp(t, { viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__exploreShowFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__exploreShowFrames.delete(id); callback(now) })
      window.__exploreShowFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__exploreShowFrames.delete(id); cancel(id) }
  })
  await page.reload()
  if (text === 2) await page.addStyleTag({ content: ':root{font-size:200%}' })
  const resident = page.locator('.room-pet'); await resident.waitFor()
  const saved = (await snapshot(page)).tables
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  const show = page.getByRole('button', { name: 'Show room to explore with Mochi', exact: true })
  assert.equal(await show.count(), 1, 'the expanded Explore heading needs its own explicit view control')
  const select = page.getByLabel('Show Mochi', { exact: true })
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value))
  await select.selectOption(options.at(-1))
  await page.getByRole('button', { name: 'Look together', exact: true }).click()
  const feedback = await page.locator('.pet-explore [role="status"]').textContent()
  assert.match(feedback, reduced ? /noticed/ : /invited/)
  const before = await resident.locator('[data-character-body]').innerHTML()
  const position = await resident.getAttribute('transform'), heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  const camera = await page.locator('.home-scene-viewport').evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }))
  await resident.evaluate(node => { window.__exploreShownPet = node })
  await show.focus()
  const box = await show.boundingBox(), heading = await page.locator('.pet-explore-heading').boundingBox()
  assert.ok(box.width >= 44 && box.height >= 44)
  assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= heading.y && box.y + box.height <= heading.y + heading.height + .01)
  assert.equal(await show.evaluate(node => node.scrollWidth <= node.clientWidth), true)
  if (process.env.CHORE_EXPLORE_SHOW_CAPTURE_DIR) {
    await mkdir(process.env.CHORE_EXPLORE_SHOW_CAPTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(process.env.CHORE_EXPLORE_SHOW_CAPTURE_DIR, `explore-show-controls-${width}-${text * 100}.png`), fullPage: false })
  }
  await page.keyboard.press('Enter')
  assert.equal(await resident.evaluate(node => node === document.activeElement && node.matches(':focus-visible') && node === window.__exploreShownPet), true)
  assert.ok(await resident.locator('[data-character-body]').evaluate(visible) >= .95)
  assert.equal(await resident.locator('[data-character-body]').innerHTML(), before)
  assert.equal(await resident.getAttribute('transform'), position)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  assert.equal(await page.locator('.pet-explore [role="status"]').textContent(), feedback)
  assert.equal(await select.inputValue(), options.at(-1))
  assert.equal(await page.locator('.room-selection').getAttribute('data-selection-object'), options.at(-1))
  assert.deepEqual(await page.locator('.home-scene-viewport').evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop })), camera)
  assert.deepEqual((await snapshot(page)).tables, saved)
  assert.ok(await page.evaluate(() => window.__exploreShowFrames.size) <= 1)
  const out = process.env.CHORE_EXPLORE_SHOW_CAPTURE_DIR
  if (out) {
    await mkdir(out, { recursive: true })
    await page.screenshot({ path: join(out, `explore-show-${width}-${text * 100}.png`), fullPage: false })
    await writeFile(join(out, `explore-show-${width}-${text * 100}.json`), JSON.stringify({ width, height, rootTextPercent: text * 100, reduced, showBox: box, headingBox: heading, selectedId: options.at(-1), feedback, camera, scope: 'Native keyboard activation/focus/target/textfit/selectedmarker/unchanged frame-placement-speech-feedback-camera-savedtables. Frozen clock;not temporal playback.' }, null, 2) + '\n')
  }
  t.diagnostic(`Chromium ${page.context().browser().version()};explicitkeyboardview;resident>=.95visible;44target;no secondinvitation/no savedchanges;atmost1clock`)
})

for (const resting of ['away', 'sick']) test(`Explore views the ${resting} resident only in its own room`, async t => {
  const page = await browserApp(t)
  const firstId = await page.evaluate(resting => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), read = store.get('snapshot')
      let firstId
      read.onsuccess = () => {
        const saved = read.result, tables = saved.tables, first = Object.values(tables.rooms)[0]
        firstId = first.id
        tables.rooms['explore-other-room'] = { ...first, id: 'explore-other-room', type: 'bedroom' }
        tables.placed_objects['explore-other-plant'] = { id: 'explore-other-plant', roomId: 'explore-other-room', catalogId: 'plant', tileX: 3, tileY: 3, rotation: 0 }
        const fridge = Object.values(tables.placed_objects).find(object => object.catalogId === 'fridge')
        tables.placed_objects['blocked-door'] = { ...fridge, id: 'blocked-door', tileX: 7, tileY: 4, rotation: 0 }
        if (resting === 'away') Object.values(tables.homes)[0].vacations = [{ start: '2000-01-01', end: '2099-12-31' }]
        else {
          tables.completions = {}
          const older = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
          for (const chore of Object.values(tables.chores)) { chore.createdOn = older; chore.schedule = { kind: 'daily' } }
        }
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve(firstId) }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), resting)
  await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__exploreShowFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__exploreShowFrames.delete(id); callback(now) })
      window.__exploreShowFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__exploreShowFrames.delete(id); cancel(id) }
  })
  await page.reload()
  const saved = (await snapshot(page)).tables
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  const show = () => page.getByRole('button', { name: 'Show room to explore with Mochi', exact: true })
  assert.equal(await show().isEnabled(), true)
  assert.equal(await page.getByRole('button', { name: 'Look together', exact: true }).isDisabled(), true)
  await page.locator('.room-controls-focus select').selectOption('explore-other-room')
  assert.match(await page.locator('.home-scene-travel-status').textContent(), /path to Bedroom is blocked/)
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  assert.equal(await show().isDisabled(), true)
  assert.equal(await show().evaluate(node => document.getElementById(node.getAttribute('aria-describedby')).textContent), "Choose Mochi's room to see them.")
  await page.locator('.room-controls-focus select').selectOption(firstId)
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  assert.equal(await show().isEnabled(), true)
  await show().focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('.room-pet').evaluate(node => node === document.activeElement), true)
  assert.equal(await page.evaluate(() => window.__exploreShowFrames.size), 0)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic('Actual blocked doorway; separate resting/view explanations;own room viewable with0frames;no saved changes.')
})
