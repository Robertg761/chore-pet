import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

async function capture(page, name) {
  const directory = process.env.CHORE_EXPLORE_CAPTURE_DIR
  if (!directory) return
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, name), fullPage: false })
}

// A local saved-home fixture, using the same persisted snapshot as other tests.
async function longPetName(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, pet = Object.values(saved.tables.pets)[0]
        pet.name = 'A very long pet name'
        const pending = saved.outbox[`pets:${pet.id}`]
        if (pending) pending.value.name = pet.name
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.reload()
}

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 664 }, { width: 1280, height: 800 }, { width: 640, height: 360 }, { width: 844, height: 390 }]) {
  test(`keyboard exploration stays still and fits ${viewport.width}px`, async t => {
    const page = await browserApp(t, { viewport })
    if (viewport.height < 500) await longPetName(page)
    const settleLayout = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await settleLayout()
    const closedRoomBounds = await page.locator('.home-scene .home-room').boundingBox()
    const toggle = page.getByRole('button', { name: 'Explore together', exact: true })
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    const select = page.getByLabel(/^Show /)
    assert.equal(await select.evaluate(node => node === document.activeElement), true)
    await page.keyboard.press('End')
    const resident = page.locator('.room-pet')
    const before = await resident.getAttribute('transform')
    await page.keyboard.press('Tab')
    const look = page.getByRole('button', { name: 'Look together', exact: true })
    assert.equal(await look.evaluate(node => node === document.activeElement), true)
    await page.keyboard.press('Enter')
    assert.match(await page.locator('.pet-explore [role="status"]').textContent(), /from here/)
    assert.ok((await page.locator('.living-room [aria-live="polite"]').textContent()).trim())
    assert.equal(await resident.getAttribute('transform'), before)
    assert.equal(await look.evaluate(node => node === document.activeElement), true)
    for (const control of [toggle, select, look]) {
      const bounds = await control.boundingBox()
      assert.ok(bounds.height >= 44 && bounds.width >= 44)
      assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1)
    }
    assert.ok((await select.boundingBox()).width >= 160, 'the closed selector must have room for the furnishing name')
    const focusClearance = await look.evaluate(node => {
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
    assert.ok(focusClearance >= -0.5, `the focused Look button and its outline must clear scroll clipping, got ${focusClearance}px`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await settleLayout()
    const roomBounds = await page.locator('.home-scene .home-room').boundingBox()
    const minimumRoomHeight = viewport.height < 500 ? 100 : 180
    assert.ok(roomBounds.height >= closedRoomBounds.height - 0.5 && roomBounds.height >= minimumRoomHeight,
      `opening Explore must retain the scene size: closed ${closedRoomBounds.height}px, open ${roomBounds.height}px`)
    await capture(page, `explore-${viewport.width}.png`)
    t.diagnostic(`Chromium ${page.context().browser().version()}; offline production; native keyboard and reduced motion`)
  })
}

function readPet(node) {
  const matrix = node.transform.baseVal.consolidate().matrix
  const body = node.querySelector('[data-character-body]')
  // Compare in the existing room SVG; disclosure/feedback can resize the scene
  // viewport, which is a layout change rather than a character pose change.
  const bodyMatrix = body.getCTM()
  return {
    at: performance.now(), frameAt: window.__exploreLastFrame ?? performance.now(),
    x: matrix.e, y: matrix.f,
    body: [[45, 40], [155, 40], [45, 182], [155, 182]].map(([x, y]) => {
      const point = new DOMPoint(x, y).matrixTransform(bodyMatrix)
      return { x: point.x, y: point.y }
    }),
  }
}

test('an invitation joins a live step, reaches the chosen detail, coalesces repeats, and respects live reduction', async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference' })
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    Math.random = () => 0.99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    const pending = new Set()
    window.__exploreFrames = pending
    window.requestAnimationFrame = callback => {
      const id = request(now => { pending.delete(id); window.__exploreLastFrame = now; callback(now) })
      pending.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id) }
  })
  await page.reload()
  const beforeData = (await snapshot(page)).tables
  const plant = Object.values(beforeData.placed_objects).find(object => object.catalogId === 'plant')
  const fridge = Object.values(beforeData.placed_objects).find(object => object.catalogId === 'fridge')
  const resident = page.locator('.room-pet')
  await resident.waitFor()
  await resident.evaluate(node => { window.__explorePet = node })
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByLabel(/^Show /).selectOption(plant.id)
  const start = await resident.evaluate(readPet)
  let before
  for (let i = 0; i < 100; i++) {
    await page.clock.runFor(32)
    const at = await resident.evaluate(readPet)
    if (Math.hypot(at.x - start.x, at.y - start.y) > 1) { before = at; break }
  }
  assert.ok(before, 'resident must be moving before the invitation')
  await page.getByRole('button', { name: 'Look together', exact: true }).click()
  const after = await resident.evaluate(readPet)
  // Input may land after the last painted frame. A tile takes420ms and projects
  // to(21.25,10.625), so bound that legitimate sub-frame route advance.
  const subframeTravel = Math.hypot(21.25, 10.625) / 420 * Math.max(0, after.at - before.frameAt)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) <= subframeTravel + 0.01, 'invitation must preserve the actual input position without rounding to a tile')
  const displacement = Math.max(...before.body.map((point, i) => Math.hypot(point.x - after.body[i].x, point.y - after.body[i].y)))
  assert.ok(displacement < 0.5, `invitation pose join: ${displacement} room SVG units`)
  assert.equal(await resident.evaluate(node => node === window.__explorePet), true)
  assert.match(await page.locator('.pet-explore [role="status"]').textContent(), /You invited/)
  const live = page.locator('.living-room [aria-live="polite"]')
  let heard = ''
  for (let i = 0; i < 100 && !heard; i++) {
    await page.clock.runFor(100)
    heard = (await live.textContent()).trim()
  }
  assert.ok(['Hello, little leaves!', "I'm waving to the plant."].includes(heard), `expected selected plant observation, got ${heard}`)
  const arrived = await resident.getAttribute('transform')
  for (let i = 0; i < 20; i++) await page.getByRole('button', { name: 'Look together', exact: true }).click()
  assert.equal(await live.textContent(), heard)
  assert.equal(await resident.getAttribute('transform'), arrived)
  assert.equal(await page.evaluate(() => window.__exploreFrames.size), 1)
  await changeReducedMotion(page, 'reduce')
  const still = await resident.getAttribute('transform')
  await page.getByLabel(/^Show /).selectOption(fridge.id)
  await page.getByRole('button', { name: 'Look together', exact: true }).click()
  assert.match(await page.locator('.pet-explore [role="status"]').textContent(), /from here/)
  await page.clock.runFor(300)
  assert.equal(await resident.getAttribute('transform'), still)
  assert.equal(await page.evaluate(() => window.__exploreFrames.size), 1)
  assert.deepEqual((await snapshot(page)).tables, beforeData, 'invitations must not alter saved home data')
  t.diagnostic(`Chromium ${page.context().browser().version()}; pose join ${displacement.toFixed(4)} room SVG units; one application rAF`)
})
