import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

async function instrument(page) {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__playFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__playFrames.delete(id); window.__playFrameAt = now; callback(now) })
      window.__playFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__playFrames.delete(id); cancel(id) }
  })
  await page.reload()
}

async function capture(page, name) {
  const directory = process.env.CHORE_PLAY_CAPTURE_DIR
  if (!directory) return
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, name), fullPage: false })
}

async function assertPetVisible(resident) {
  const visible = await resident.evaluate(node => {
    const body = node.querySelector('[data-character-body]').getBoundingClientRect()
    let top = 0, right = innerWidth, bottom = innerHeight, left = 0
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), clip = parent.getBoundingClientRect()
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        top = Math.max(top, clip.top + parent.clientTop)
        bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight)
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        left = Math.max(left, clip.left + parent.clientLeft)
        right = Math.min(right, clip.left + parent.clientLeft + parent.clientWidth)
      }
    }
    return Math.max(0, Math.min(right, body.right) - Math.max(left, body.left))
      * Math.max(0, Math.min(bottom, body.bottom) - Math.max(top, body.top)) / (body.width * body.height)
  })
  assert.ok(visible >= .95, `the character must stay visible while choosing a response: ${visible}`)
}

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 664 }, { width: 1280, height: 800 }, { width: 640, height: 360 }, { width: 844, height: 390 }]) {
  test(`native player choices stay still and fit ${viewport.width}px`, async t => {
    const page = await browserApp(t, { viewport })
    await instrument(page)
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const saved = (await snapshot(page)).tables
    const toggle = page.getByRole('button', { name: 'Spend time together', exact: true })
    assert.equal(await toggle.count(), 1, 'home must offer optional player choices')
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    const originalRoom = await page.locator('.home-scene .home-room').boundingBox()
    const position = await resident.getAttribute('transform')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    const wave = page.getByRole('button', { name: 'Wave', exact: true })
    const pats = page.getByRole('button', { name: 'Gentle pats', exact: true })
    const hop = page.getByRole('button', { name: 'Happy hop', exact: true })
    assert.equal(await hop.count(), 1)
    assert.equal(await wave.evaluate(node => node === document.activeElement), true)
    await page.keyboard.press('Enter')
    await assertPetVisible(resident)
    const live = page.locator('.living-room [aria-live="polite"]')
    const hello = (await live.textContent()).trim()
    assert.ok(hello)
    assert.equal(await page.locator('.pet-play [role="status"]').textContent(), '', 'the pet owns the successful announcement')
    assert.equal(await page.evaluate(() => window.__playFrames.size), 1)
    await page.clock.runFor(1400)
    assert.equal(await page.evaluate(() => window.__playFrames.size), 0)
    await page.keyboard.press('Tab')
    assert.equal(await pats.evaluate(node => node === document.activeElement), true)
    await page.keyboard.press('Enter')
    await assertPetVisible(resident)
    assert.notEqual((await live.textContent()).trim(), hello)
    await page.clock.runFor(800)
    assert.equal(await resident.getAttribute('transform'), position)
    for (const control of [toggle, wave, pats, hop]) {
      const bounds = await control.boundingBox()
      assert.ok(bounds.height >= 44 && bounds.width >= 44)
      assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1)
    }
    const room = await page.locator('.home-scene .home-room').boundingBox()
    assert.ok(room.height >= originalRoom.height - .5, 'expanded player choices must preserve room size')
    await page.clock.runFor(1000)
    assert.equal(await page.evaluate(() => window.__playFrames.size), 0)
    await page.keyboard.press('Tab')
    assert.equal(await hop.evaluate(node => node === document.activeElement), true)
    const stillBody = await resident.locator('[data-character-body]').getAttribute('transform')
    await page.keyboard.press('Enter')
    await assertPetVisible(resident)
    assert.equal(await page.locator('.pet-play [role="status"]').textContent(), '')
    await page.clock.runFor(900)
    assert.equal(await resident.locator('[data-character-body]').getAttribute('transform'), stillBody)
    assert.equal(await resident.getAttribute('transform'), position)
    assert.equal(await page.evaluate(() => window.__playFrames.size), 1)
    const clearance = await hop.evaluate(node => {
      const bounds = node.getBoundingClientRect(), style = getComputedStyle(node)
      const ring = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset))
      let bottom = innerHeight
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) {
          const clip = parent.getBoundingClientRect()
          bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight)
        }
      }
      return bottom - bounds.bottom - ring
    })
    assert.ok(clearance >= -.5, `focused hop outline must clear scroll clipping: ${clearance}px`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await capture(page, `play-${viewport.width}.png`)
    await page.clock.runFor(1000)
    assert.equal(await page.evaluate(() => window.__playFrames.size), 0)
    assert.deepEqual((await snapshot(page)).tables, saved)
    t.diagnostic(`Chromium ${page.context().browser().version()}; native keyboard,reduced still,finite single clock,44px,unchanged saved tables`)
  })
}

function readPet(node) {
  const matrix = node.transform.baseVal.consolidate().matrix
  const body = node.querySelector('[data-character-body]').getCTM()
  return { at: performance.now(), frameAt: window.__playFrameAt,
    x: matrix.e, y: matrix.f,
    body: [[45, 40], [155, 40], [45, 182], [155, 182]].map(([x, y]) => {
      const point = new DOMPoint(x, y).matrixTransform(body)
      return { x: point.x, y: point.y }
    }) }
}

test('room changes remove the previous furnishing choices and reset player-time controls', async t => {
  const page = await browserApp(t)
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, first = Object.values(saved.tables.rooms)[0], object = Object.values(saved.tables.placed_objects)[0]
        saved.tables.rooms.second = { ...first, id: 'second', type: 'bedroom' }
        saved.tables.rooms.empty = { ...first, id: 'empty', type: 'living' }
        saved.tables.placed_objects['second-object'] = { ...object, id: 'second-object', roomId: 'second' }
        saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.reload()
  const explore = page.getByRole('button', { name: 'Explore together', exact: true })
  const play = page.getByRole('button', { name: 'Spend time together', exact: true })
  await explore.click()
  await play.click()
  await page.getByLabel(/^Focused room/).selectOption('second')
  assert.equal(await explore.count(), 1)
  assert.equal(await play.count(), 1)
  assert.equal(await explore.getAttribute('aria-expanded'), 'false')
  assert.equal(await play.getAttribute('aria-expanded'), 'false')
  assert.deepEqual(await page.locator('.pet-explore option').evaluateAll(nodes => nodes.map(node => node.value)), ['second-object'])
  await page.getByLabel(/^Focused room/).selectOption('empty')
  assert.equal(await explore.count(), 0)
  assert.equal(await play.count(), 1)
})

test('chosen affection joins a live step, ignores rapid busy choices, and honors live motion reduction', async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference' })
  await instrument(page)
  const resident = page.locator('.room-pet')
  await resident.waitFor()
  const toggle = page.getByRole('button', { name: 'Spend time together', exact: true })
  assert.equal(await toggle.count(), 1)
  await toggle.click()
  await resident.evaluate(node => { window.__playPet = node })
  const saved = (await snapshot(page)).tables
  const start = await resident.evaluate(readPet)
  let before
  for (let i = 0; i < 100; i++) {
    await page.clock.runFor(32)
    const at = await resident.evaluate(readPet)
    if (Math.hypot(at.x - start.x, at.y - start.y) > 1) { before = at; break }
  }
  assert.ok(before, 'sample must start during a genuine walk')
  const pats = page.getByRole('button', { name: 'Gentle pats', exact: true })
  await pats.click()
  const after = await resident.evaluate(readPet)
  const subframe = Math.hypot(21.25, 10.625) / 420 * Math.max(0, after.at - before.frameAt)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) <= subframe + .01)
  const join = Math.max(...before.body.map((point, i) => Math.hypot(point.x - after.body[i].x, point.y - after.body[i].y)))
  assert.ok(join < .5, `chosen affection pose join:${join}roomSVGunits`)
  assert.equal(await resident.evaluate(node => node === window.__playPet), true)
  const live = page.locator('.living-room [aria-live="polite"]')
  const heard = await live.textContent()
  await page.clock.runFor(600)
  const active = await resident.evaluate(readPet)
  for (let i = 0; i < 20; i++) await page.getByRole('button', { name: 'Wave', exact: true }).click()
  const busy = await resident.evaluate(readPet)
  assert.deepEqual(busy.body, active.body)
  assert.equal(await live.textContent(), heard)
  assert.match(await page.locator('.pet-play [role="status"]').textContent(), /moment/)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 1)
  await changeReducedMotion(page, 'reduce')
  await page.clock.runFor(1800)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 0)
  await page.getByRole('button', { name: 'Wave', exact: true }).click()
  assert.equal(await page.locator('.pet-play [role="status"]').textContent(), '')
  assert.notEqual(await live.textContent(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic(`Chromium ${page.context().browser().version()}; join${join.toFixed(4)}roomSVGunits;20busychoices;oneframeclock;live reduction`)
})


test('a chosen hop takes off and lands on the existing resident clock without changing progress', async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference' })
  await instrument(page)
  const resident = page.locator('.room-pet')
  await resident.waitFor()
  const saved = (await snapshot(page)).tables
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  const before = await resident.evaluate(readPet)
  const shadow = await resident.locator('[data-character-ground]').getAttribute('transform')
  await page.getByRole('button', { name: 'Happy hop', exact: true }).click()
  await page.clock.runFor(756)
  const lifted = await resident.evaluate(readPet)
  assert.equal(lifted.x, before.x)
  assert.equal(lifted.y, before.y)
  assert.ok(lifted.body[0].y < before.body[0].y - 1, 'the sampled character must visibly lift at the existing peak')
  assert.notEqual(await resident.locator('[data-character-ground]').getAttribute('transform'), shadow)
  await assertPetVisible(resident)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 1)
  await capture(page, 'hop-peak-390.png')
  const heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  for (let n = 0; n < 10; n++) await page.getByRole('button', { name: 'Happy hop', exact: true }).click()
  assert.deepEqual((await resident.evaluate(readPet)).body, lifted.body)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  assert.match(await page.locator('.pet-play [role="status"]').textContent(), /moment/)
  await page.clock.runFor(1200)
  assert.equal(await resident.locator('[data-expression="content"]').count(), 1)
  assert.equal(await resident.locator('[data-character-ground]').getAttribute('transform'), shadow)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 1, 'normal healthy idle keeps its original clock')
  await changeReducedMotion(page, 'reduce')
  await page.clock.runFor(120)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 0)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic(`Chromium ${page.context().browser().version()};existing1800ms hop;10busyrequests;groundedlanding;unchanged saved tables`)
})
