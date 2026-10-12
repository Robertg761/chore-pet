import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

async function instrument(page, freeze = true) {
  if (freeze) {
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 1000)
  }
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__showRoomFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__showRoomFrames.delete(id); window.__showRoomFrameAt = now; callback(now) })
      window.__showRoomFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__showRoomFrames.delete(id); cancel(id) }
  })
  await page.reload()
}

test('Show room resumes an offscreen reaction only while its deadline remains active', async t => {
  const page = await browserApp(t, { viewport: { width: 320, height: 640 }, reducedMotion: 'reduce' })
  // Native observation runs against the real scroll container and real deadlines.
  await instrument(page, false)
  const resident = page.locator('.room-pet'), show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
  await resident.waitFor()
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  const saved = (await snapshot(page)).tables
  const scrollAway = async () => {
    await page.mouse.move(300, 450)
    await page.mouse.wheel(0, 3000)
    await page.waitForFunction(() => document.querySelector('.room-pet').getBoundingClientRect().bottom < 0)
    await page.waitForFunction(() => window.__showRoomFrames.size === 0)
  }
  await scrollAway()
  await page.getByRole('button', { name: 'Stretch together', exact: true }).click()
  const heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  assert.match(heard, /stretch/i)
  assert.equal(await page.evaluate(() => window.__showRoomFrames.size), 0)
  await show.focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__showRoomFrames.size === 1)
  assert.equal(await resident.locator('[data-expression]').getAttribute('data-expression'), 'cheering')
  assert.equal(await resident.evaluate(node => node === document.activeElement), true)
  assert.ok(await resident.locator('[data-character-body]').evaluate(visible) >= .95)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  await scrollAway()
  await page.waitForTimeout(2500)
  assert.equal(await page.evaluate(() => window.__showRoomFrames.size), 0)
  await show.focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('.room-pet [data-expression]').getAttribute('data-expression') === 'content')
  assert.equal(await page.evaluate(() => window.__showRoomFrames.size), 0)
  assert.equal(await resident.evaluate(node => node === document.activeElement), true)
  assert.ok(await resident.locator('[data-character-body]').evaluate(visible) >= .95)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic('Native offscreen 0 → live visible 1 → offscreen 0 → expired visible 0; no replay or saved changes.')
})

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

for (const resting of ['away', 'sick']) test(`Show room explains a blocked route while ${resting} and still views the resting resident's own room`, async t => {
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
        tables.rooms['second-room'] = { ...first, id: 'second-room', type: 'bedroom' }
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
  await instrument(page)
  const saved = (await snapshot(page)).tables
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  let show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
  assert.equal(await show.isEnabled(), true)
  await page.locator('.room-controls-focus select').selectOption('second-room')
  assert.match(await page.locator('.home-scene-travel-status').textContent(), /path to Bedroom is blocked/)
  assert.equal(await page.locator('.home-scene-room[data-focused="true"] .room-pet').count(), 0)
  assert.equal(await page.locator('.room-pet').count(), 1)
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
  assert.equal(await show.isDisabled(), true)
  assert.equal(await show.evaluate(node => document.getElementById(node.getAttribute('aria-describedby')).textContent), "Choose Mochi's room to see them.")
  assert.match(await page.locator('.pet-play').textContent(), /resting/)
  if (process.env.CHORE_SHOW_ROOM_CAPTURE_DIR) {
    await mkdir(process.env.CHORE_SHOW_ROOM_CAPTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(process.env.CHORE_SHOW_ROOM_CAPTURE_DIR, `show-room-${resting}-blocked.png`), fullPage: false })
  }
  await page.locator('.room-controls-focus select').selectOption(firstId)
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
  assert.equal(await show.isEnabled(), true)
  await show.focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('.room-pet').evaluate(node => node === document.activeElement), true)
  assert.equal(await page.evaluate(() => window.__showRoomFrames.size), 0)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic('Real blocked doorway, resting resident in source room; disabled explanation at destination, own room still viewable, no clock or saved changes.')
})

for (const viewport of [{ width: 320, height: 640 }, { width: 361, height: 664 }, { width: 390, height: 664 }, { width: 640, height: 360 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`Show room preserves a live stretch and restores context at${viewport.width}x${viewport.height}`, async t => {
    const reduced = viewport.width < 640
    const page = await browserApp(t, { viewport, reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await instrument(page)
    const resident = page.locator('.room-pet'), room = page.locator('.home-scene-room[data-focused="true"] .home-room')
    await resident.waitFor()
    await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
    const show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
    assert.equal(await show.count(), 1)
    await page.getByRole('button', { name: 'Stretch together', exact: true }).click()
    await page.clock.runFor(reduced ? 128 : 900)
    await show.focus()
    const bounds = await show.boundingBox()
    assert.ok(bounds.width >= 44 && bounds.height >= 44)
    const saved = (await snapshot(page)).tables, before = await resident.locator('[data-character-body]').innerHTML()
    const position = await resident.getAttribute('transform'), heard = await page.locator('.living-room [aria-live="polite"]').textContent()
    const camera = await page.locator('.home-scene-viewport').evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }))
    await resident.evaluate(node => { window.__shownRoomPet = node })
    const initialVisibility = await room.evaluate(visible)
    await page.keyboard.press('Enter')
    assert.equal(await resident.evaluate(node => node === document.activeElement), true)
    assert.equal(await resident.evaluate(node => node.matches(':focus-visible')), true)
    assert.ok(await room.evaluate(visible) >= .95, 'the focused room must be visible after the explicit Show room choice')
    assert.ok(await resident.locator('[data-character-body]').evaluate(visible) >= .95)
    assert.equal(await resident.evaluate(node => node === window.__shownRoomPet), true)
    assert.equal(await resident.locator('[data-character-body]').innerHTML(), before)
    assert.equal(await resident.getAttribute('transform'), position)
    assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
    assert.equal(await page.locator('.pet-play [role="status"]').textContent(), '')
    assert.equal(await page.evaluate(() => window.__showRoomFrames.size), 1)
    assert.deepEqual(await page.locator('.home-scene-viewport').evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop })), camera)
    assert.deepEqual((await snapshot(page)).tables, saved)
    if (process.env.CHORE_SHOW_ROOM_CAPTURE_DIR) {
      await mkdir(process.env.CHORE_SHOW_ROOM_CAPTURE_DIR, { recursive: true })
      await page.screenshot({ path: join(process.env.CHORE_SHOW_ROOM_CAPTURE_DIR, `show-room-${viewport.width}.png`), fullPage: false })
    }
    await page.clock.runFor(2600)
    assert.equal(await page.evaluate(() => window.__showRoomFrames.size), reduced ? 0 : 1)
    t.diagnostic(`Chromium ${page.context().browser().version()}; roomvisibility before${initialVisibility.toFixed(3)};after>=.95;keyboardpetfocus;unchanged livegesture/camera/position/node/announcement/savedtables;existingclock`)
  })
}
