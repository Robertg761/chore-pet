// Run against a local server with Supabase disabled:
//   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1 --port 5173
//   node scripts/test-multiroom.mjs
// Optional: URL=http://127.0.0.1:4173/ CHROME=/path/to/chromium OUTPUT_DIR=/tmp/multiroom
// CHECK=blocked-door runs only the isolated obstruction and recovery case.
// Uses a fresh browser context. All changes happen through the UI; IndexedDB is read only.
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const base = new URL(process.env.URL ?? 'http://127.0.0.1:5173/')
base.searchParams.set('dev', '')
const output = process.env.OUTPUT_DIR ?? await mkdtemp(join(tmpdir(), 'chore-pet-multiroom-'))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/chromium', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
// Also isolate a mistakenly configured dev server from remote account services.
await context.route('**/*', (route) => {
  const request = new URL(route.request().url())
  return /^https?:$/.test(request.protocol) && request.origin !== base.origin ? route.abort('blockedbyclient') : route.continue()
})
const page = await context.newPage()
page.setDefaultTimeout(8000)
const errors = []
const steps = []
page.on('pageerror', (error) => errors.push(error.message))
const button = (name) => page.getByRole('button', { name, exact: true })
const focusSelect = () => page.getByRole('combobox', { name: 'Focused room', exact: true })
const scene = () => page.locator('.home-scene')
const rooms = () => scene().locator('[data-room-id]')
const room = (id) => scene().locator(`[data-room-id="${id}"]`)
const objects = (snapshot, roomId) => Object.values(snapshot.tables.placed_objects).filter((object) => object.roomId === roomId)
const sampleKitchenCatalogIds = ['counter', 'sink', 'dishwasher', 'fridge', 'stove', 'trash', 'recycling', 'plant', 'rug', 'dining-table']
const maxRooms = 6

function assertSampleKitchen(data, roomId) {
  assert.deepEqual(objects(data, roomId).map((object) => object.catalogId).sort(), [...sampleKitchenCatalogIds].sort())
}

async function eventually(check, description, timeout = 8000) {
  const end = Date.now() + timeout
  let lastError
  do {
    try { return await check() } catch (error) { lastError = error }
    await page.waitForTimeout(50)
  } while (Date.now() < end)
  throw new Error(description, { cause: lastError })
}

async function step(name, run) {
  console.log(`RUN ${name}`)
  await run()
  steps.push(name)
  console.log(`PASS ${name}`)
}

async function snapshot(target = page) {
  return target.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('kv', 'readonly')
      const read = transaction.objectStore('kv').get('snapshot')
      read.onsuccess = () => resolve(read.result)
      read.onerror = () => reject(read.error)
      transaction.oncomplete = () => db.close()
    }
  }))
}

async function saved(check, description) {
  return eventually(async () => { const data = await snapshot(); check(data); return data }, description)
}

async function assertFocus(id, count) {
  await eventually(async () => {
    assert.equal(await focusSelect().inputValue(), id)
    assert.equal(await rooms().count(), count)
    assert.equal(await scene().locator('[data-focused="true"]').count(), 1)
    assert.equal(await room(id).getAttribute('data-focused'), 'true')
    assert.equal(await scene().locator('[data-focused="false"]').count(), count - 1)
    for (const other of await rooms().all()) assert.equal(await other.locator('svg[aria-label^="Room with"]').count(), 1)
  }, 'All rooms must remain rendered with exactly one focused room')
}

async function assertPetAt(id, timeout = 12_000) {
  await eventually(async () => {
    assert.equal(await scene().locator('.home-traveler').count(), 0, 'Travel must finish')
    assert.equal(await scene().locator('.room-pet').count(), 1, 'There must be exactly one resident pet')
    assert.equal(await scene().locator('.ch-breathe').count(), 1, 'Only one character must be drawn in the home')
    assert.equal(await room(id).locator('.room-pet').count(), 1, 'The pet must arrive in the requested room')
  }, 'The single pet must settle in the destination room', timeout)
}

async function watchPetTravel(id) {
  await scene().locator('.home-traveler').waitFor({ state: 'attached' })
  const positions = new Set()
  const end = Date.now() + 12_000
  while (await scene().locator('.home-traveler').count()) {
    const state = await scene().evaluate((element) => ({
      count: element.querySelectorAll('.room-pet, .home-traveler').length,
      characters: element.querySelectorAll('.ch-breathe').length,
      transform: element.querySelector('.home-traveler > g')?.getAttribute('transform'),
    }))
    assert.equal(state.count, 1, 'Exactly one pet must exist throughout the journey')
    assert.equal(state.characters, 1, 'Travel must not leave another character drawn in a room')
    if (state.transform) positions.add(state.transform)
    assert.ok(Date.now() < end, 'The pet journey must finish within twelve seconds')
    await page.waitForTimeout(25)
  }
  assert.ok(positions.size > 1, 'Normal motion must move the pet through the scene')
  await assertPetAt(id)
}

async function addRoom(type) {
  await button('Add room').click()
  await page.getByRole('combobox', { name: 'Room type', exact: true }).selectOption({ label: type })
  await button('Create room').click()
  await eventually(async () => assert.equal(await button('Create room').count(), 0), 'Room creation should close its form')
  return focusSelect().inputValue()
}

async function keyboardFocusRoom(id) {
  const values = await focusSelect().locator('option').evaluateAll((options) => options.map((option) => option.value))
  const from = values.indexOf(await focusSelect().inputValue())
  const to = values.indexOf(id)
  assert.ok(from >= 0 && to >= 0, 'Both rooms must be in the room picker')
  await focusSelect().focus()
  for (let index = 0; index < Math.abs(to - from); index++) await focusSelect().press(to < from ? 'ArrowUp' : 'ArrowDown')
}

async function closeObjectSheet() {
  const close = page.locator('.build-panel .sheet').getByRole('button', { name: 'Close', exact: true })
  if (await close.count()) await close.click()
}

async function navigate(name) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true }).click()
}

async function finishDueChores() {
  // Closing gifts with Escape is a supported action and leaves rewards unlocked.
  for (let tries = 0; tries < 60; tries++) {
    const gift = page.locator('.gift-panel')
    if (await gift.count()) { await gift.press('Escape'); continue }
    const done = page.getByRole('button', { name: /^Done: / })
    if (!(await done.count())) return
    const before = await snapshot()
    const count = Object.keys(before.tables.completions).length
    const unlocked = Object.values(before.tables.progress)[0].unlockedItems.length
    await done.first().click()
    const after = await saved((data) => assert.equal(Object.keys(data.tables.completions).length, count + 1), 'Chore feedback must finish and save before continuing')
    if (Object.values(after.tables.progress)[0].unlockedItems.length > unlocked) {
      await gift.waitFor({ state: 'visible' })
      await gift.press('Escape')
    }
  }
  throw new Error('Chore list did not settle after 60 completion/gift actions')
}

async function nextDay() {
  await page.getByRole('button', { name: /^Open time panel/ }).click()
  await button('+1 day').click()
  await button('Collapse time panel').click()
}

async function assertNoOverflow() {
  const sizes = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert.ok(sizes.page <= sizes.viewport + 1 && sizes.body <= sizes.viewport + 1, `Horizontal page overflow: ${JSON.stringify(sizes)}`)
}

async function assertLabelsFit() {
  const viewport = await scene().locator('.home-scene-viewport').boundingBox()
  for (const label of await scene().locator('.home-scene-label').all()) {
    const bounds = await label.boundingBox()
    assert.ok(bounds.x >= viewport.x - 1 && bounds.y >= viewport.y - 1 &&
      bounds.x + bounds.width <= viewport.x + viewport.width + 1 &&
      bounds.y + bounds.height <= viewport.y + viewport.height + 1,
    `${await label.getAttribute('aria-label')} must fit in the scene: ${JSON.stringify({ bounds, viewport })}`)
  }
}

async function assertDoorTargets() {
  for (const door of await scene().locator('.room-door').all()) {
    const hit = await door.evaluate((element) => (element.matches('.room-door-hit') ? element : element.querySelector('.room-door-hit')).getBoundingClientRect().toJSON())
    assert.ok(hit.width >= 43.9 && hit.height >= 43.9, `Door touch target must be at least 44px: ${JSON.stringify(hit)}`)
    const probes = await door.evaluate((element) => {
      const hit = (element.matches('.room-door-hit') ? element : element.querySelector('.room-door-hit')).getBoundingClientRect()
      return [[0, 0], [-16, 0], [16, 0], [0, -16], [0, 16]].map(([dx, dy]) => {
        const x = hit.x + hit.width / 2 + dx
        const y = hit.y + hit.height / 2 + dy
        const target = document.elementFromPoint(x, y)
        return { dx, dy, accepts: target?.closest('.room-door') === element, interceptedBy: target?.tagName }
      })
    })
    assert.ok(probes.every((probe) => probe.accepts), `${await door.getAttribute('aria-label')} must receive input across its touch target: ${JSON.stringify(probes)}`)
  }
}

async function assertFadedInactive() {
  const opacity = await rooms().evaluateAll((elements) => elements.map((element) => {
    let opacity = 1
    let node = element.querySelector('svg[aria-label^="Room with"]')
    while (node && !node.classList.contains('home-scene')) {
      opacity *= Number(getComputedStyle(node).opacity)
      node = node.parentElement
    }
    return { id: element.getAttribute('data-room-id'), focused: element.getAttribute('data-focused') === 'true', opacity }
  }))
  const active = opacity.find((item) => item.focused)
  assert.ok(active, 'A room is focused')
  for (const inactive of opacity.filter((item) => !item.focused)) {
    assert.ok(inactive.opacity < active.opacity, `Inactive room ${inactive.id} should be faded: ${JSON.stringify(opacity)}`)
    assert.ok(inactive.opacity > 0, 'Inactive rooms must remain visible')
  }
}

async function roomStyle(svg) {
  return svg.evaluate((element) => {
    const shell = element.querySelector(':scope > g > g')
    const [floor, walls] = shell.children
    return {
      floorColour: floor.querySelector(':scope > polygon').getAttribute('fill'),
      floorPattern: floor.children[2].innerHTML,
      wallColours: [...walls.children].map((face) => face.querySelector(':scope > polygon').getAttribute('fill')),
    }
  })
}

async function blockedDoorRecovery() {
  const blockedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await blockedContext.route('**/*', (route) => {
    const request = new URL(route.request().url())
    return /^https?:$/.test(request.protocol) && request.origin !== base.origin ? route.abort('blockedbyclient') : route.continue()
  })
  const blockedPage = await blockedContext.newPage()
  blockedPage.setDefaultTimeout(8000)
  blockedPage.on('pageerror', (error) => errors.push(error.message))
  const b = (name) => blockedPage.getByRole('button', { name, exact: true })
  const select = () => blockedPage.getByRole('combobox', { name: 'Focused room', exact: true })
  const sc = () => blockedPage.locator('.home-scene')
  const r = (id) => sc().locator(`[data-room-id="${id}"]`)
  const nav = (name) => blockedPage.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true }).click()
  try {
    await blockedPage.goto(base.href, { waitUntil: 'networkidle' })
    await b('Collapse time panel').click()
    await b('Try a sample home').click()
    await b('Make it mine').click()
    await select().waitFor({ state: 'visible' })
    const kitchen = await select().inputValue()
    const initial = await eventually(async () => {
      const data = await snapshot(blockedPage)
      assertSampleKitchen(data, kitchen)
      return data
    }, 'The isolated sample kitchen must be saved before arranging it')
    const trash = objects(initial, kitchen).find((object) => object.catalogId === 'trash')
    assert.ok(trash)
    await nav('Build')
    await r(kitchen).locator(`[data-object-id="${trash.id}"]`).click()
    const editor = blockedPage.locator('.build-room')
    await editor.focus()
    // Step into the open aisle before crossing; the back wall has recycling and a plant.
    await editor.press('ArrowDown')
    for (let tile = trash.tileX; tile < 7; tile++) await editor.press('ArrowRight')
    for (let tile = trash.tileY + 1; tile < 4; tile++) await editor.press('ArrowDown')
    await eventually(async () => {
      const object = (await snapshot(blockedPage)).tables.placed_objects[trash.id]
      assert.equal(object.tileX, 7)
      assert.equal(object.tileY, 4)
    }, 'The fixture trash can must occupy a future doorway before the bedroom exists')
    await b('Add room').click()
    await blockedPage.getByRole('combobox', { name: 'Room type', exact: true }).selectOption({ label: 'Bedroom' })
    await b('Create room').click()
    const bedroom = await select().inputValue()
    assert.notEqual(bedroom, kitchen)
    await nav('Home')
    await eventually(async () => {
      assert.equal(await select().inputValue(), bedroom)
      assert.match(await sc().locator('.home-scene-travel-status').textContent(), /path to Bedroom is blocked/)
      assert.equal(await sc().locator('.home-traveler').count(), 0)
      assert.equal(await r(kitchen).locator('.room-pet').count(), 1)
      assert.equal(await r(bedroom).locator('.room-pet').count(), 0)
      assert.equal(await sc().locator('.ch-breathe').count(), 1)
    }, 'A blocked route must keep the one pet in its original room and explain why')
    assert.equal(await b('Door to Kitchen, blocked by furniture').getAttribute('aria-disabled'), 'true')
    await blockedPage.screenshot({ path: join(output, 'blocked-doorway.png'), fullPage: true })
    await nav('Build')
    await select().selectOption(kitchen)
    await editor.focus()
    let found = false
    for (let pick = 0; pick < objects(initial, kitchen).length; pick++) {
      await editor.press(']')
      if ((await blockedPage.locator('.build-room-status').textContent()).includes('Trash can selected.')) { found = true; break }
    }
    assert.ok(found, 'Keyboard selection must reach furniture blocking the doorway')
    await editor.press('ArrowLeft')
    await eventually(async () => {
      const object = (await snapshot(blockedPage)).tables.placed_objects[trash.id]
      assert.equal(object.tileX, 6)
      assert.equal(object.tileY, 4)
    }, 'Existing furniture must be movable off the reserved doorway')
    await nav('Home')
    await select().selectOption(bedroom)
    await eventually(async () => {
      assert.equal(await sc().locator('.home-traveler').count(), 0)
      assert.equal(await r(bedroom).locator('.room-pet').count(), 1)
      assert.equal(await sc().locator('.ch-breathe').count(), 1)
      assert.match(await sc().locator('.home-scene-travel-status').textContent(), /arrived in Bedroom/)
    }, 'Clearing the doorway must restore pet travel to the selected bedroom')
    await blockedPage.screenshot({ path: join(output, 'cleared-doorway.png'), fullPage: true })
  } catch (error) {
    await blockedPage.screenshot({ path: join(output, 'blocked-recovery-failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally {
    await blockedContext.close()
  }
}

let kitchenId
let bedroomId
let bedId
let kitchenObjects
try {
  if (process.env.CHECK !== 'blocked-door') {
    await step('Sample home exposes a focused room in the shared scene', async () => {
      await page.goto(base.href, { waitUntil: 'networkidle' })
      // Completions cannot be dated in the future. Start three days ago to earn a four-day streak.
      for (let day = 0; day < 3; day++) await button('-1 day').click()
      await button('Collapse time panel').click()
      await button('Try a sample home').click()
      await button('Make it mine').click()
      await focusSelect().waitFor({ state: 'visible' })
      kitchenId = await focusSelect().inputValue()
      assert.equal(await focusSelect().locator('option:checked').textContent(), 'Kitchen')
      await assertFocus(kitchenId, 1)
      assert.equal(await scene().locator('.room-pet').count(), 1)
      const data = await saved((data) => assertSampleKitchen(data, kitchenId), 'The complete sample kitchen must be persisted')
      kitchenObjects = objects(data, kitchenId)
    })

    await step('Room creation can cancel and creates a separate focused bedroom', async () => {
      await navigate('Build')
      await button('Add room').click()
      const type = page.getByRole('combobox', { name: 'Room type', exact: true })
      assert.deepEqual(await type.locator('option').allTextContents(), ['Kitchen', 'Bedroom', 'Bathroom', 'Living room', 'Room'])
      await button('Cancel').click()
      await assertFocus(kitchenId, 1)
      bedroomId = await addRoom('Bedroom')
      assert.notEqual(bedroomId, kitchenId)
      await assertFocus(bedroomId, 2)
      assert.match(await room(bedroomId).locator('svg[aria-label^="Room with"]').getAttribute('aria-label'), /oat rug floor and butter walls/)
      assert.equal(await page.locator('.build-room').count(), 1)
      assert.equal(await room(bedroomId).locator('.build-room-svg').count(), 1)
      assert.equal(await room(kitchenId).locator('[data-object-id]').count(), kitchenObjects.length)
      assert.equal(await room(bedroomId).locator('[data-object-id]').count(), 0)
      await eventually(assertFadedInactive, 'Inactive kitchen must remain visible and faded')
      await page.screenshot({ path: join(output, 'desktop-two-rooms.png'), fullPage: true })
    })

    await step('Connected floor edges meet and a doorway sends one moving pet to its destination', async () => {
      await navigate('Home')
      await assertPetAt(bedroomId)
      const boundaryPoint = (id, tx, ty) => room(id).locator('svg[aria-label^="Room with"]').evaluate((svg, tile) => {
        const point = new DOMPoint(195 + (tile.tx - tile.ty) * 21.25, 130 + (tile.tx + tile.ty) * 10.625).matrixTransform(svg.getScreenCTM())
        return { x: point.x, y: point.y }
      }, { tx, ty })
      const a = await boundaryPoint(kitchenId, 8, 5)
      const b = await boundaryPoint(bedroomId, 0, 5)
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, 'The two room floors must share a boundary without a gap')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await button('Door to Kitchen').click()
      await assertFocus(kitchenId, 2)
      await watchPetTravel(kitchenId)
      assert.match(await scene().locator('.home-scene-travel-status').textContent(), /arrived in Kitchen/)
      await page.screenshot({ path: join(output, 'connected-rooms-arrival.png'), fullPage: true })
    })

    await step('Rapid room reselection leaves one pet in the final requested room', async () => {
      await focusSelect().selectOption(bedroomId)
      await scene().locator('.home-traveler').waitFor({ state: 'attached' })
      await focusSelect().selectOption(kitchenId)
      await focusSelect().selectOption(bedroomId)
      await assertFocus(bedroomId, 2)
      await assertPetAt(bedroomId)
      await page.waitForTimeout(300)
      await assertPetAt(bedroomId)
    })

    await step('Reduced motion doorway navigation arrives without a lingering traveler', async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await button('Door to Kitchen').click()
      await assertFocus(kitchenId, 2)
      await assertPetAt(kitchenId, 1500)
      const door = button('Door to Bedroom')
      await door.focus()
      await door.press('Enter')
      await assertFocus(bedroomId, 2)
      await assertPetAt(bedroomId, 1500)
      assert.ok(await button('Focus Bedroom').evaluate((element) => element === document.activeElement), 'Keyboard doorway navigation must retain focus on the destination room label')
      await navigate('Build')
    })

    await step('Placing and moving a bed changes only the focused bedroom', async () => {
      await page.locator('.tray').getByRole('button', { name: /^Bed\b/ }).click()
      assert.equal(await scene().locator('g[opacity="0.78"]').count(), 1)
      await button('Place it').click()
      let data = await saved((data) => assert.equal(objects(data, bedroomId).length, 1), 'Bed must be saved in the bedroom')
      const bed = objects(data, bedroomId)[0]
      bedId = bed.id
      assert.equal(bed.catalogId, 'bed')
      assert.deepEqual(objects(data, kitchenId), kitchenObjects)
      assert.equal(await room(bedroomId).locator(`[data-object-id="${bedId}"]`).count(), 1)
      await closeObjectSheet()
      const editor = page.locator('.build-room')
      await editor.focus()
      await editor.press('ArrowRight')
      await editor.press('ArrowDown')
      data = await saved((data) => assert.equal(objects(data, bedroomId)[0].tileY, bed.tileY + 1), 'Keyboard move must update the bedroom bed')
      assert.deepEqual(objects(data, kitchenId), kitchenObjects)
      await closeObjectSheet()
    })

    await step('Build keeps doorway approaches clear and doorway clicks cancel pending placement', async () => {
      const before = await snapshot()
      await page.locator('.tray').getByRole('button', { name: /^Potted plant\b/ }).click()
      const editor = page.locator('.build-room')
      await editor.focus()
      for (let tile = 0; tile < 4; tile++) await editor.press('ArrowDown')
      await eventually(async () => {
        assert.match(await page.locator('.build-room-status').textContent(), /Keep the doorway clear\./)
        assert.equal(await button('Place it').isDisabled(), true)
      }, 'Furniture on a reserved doorway must not be placeable')
      await editor.press('Enter')
      assert.deepEqual((await snapshot()).tables.placed_objects, before.tables.placed_objects)
      await button('Door to Kitchen').click()
      await assertFocus(kitchenId, 2)
      assert.equal(await button('Place it').count(), 0, 'Door navigation must clear the pending object')
      assert.deepEqual((await snapshot()).tables.placed_objects, before.tables.placed_objects)
      await button('Focus Bedroom').click()
      await assertFocus(bedroomId, 2)
    })

    await step('Keyboard room switching cancels pending placement and clears selection', async () => {
      await page.locator('.tray').getByRole('button', { name: /^Bed\b/ }).click()
      assert.equal(await button('Place it').count(), 1)
      await keyboardFocusRoom(kitchenId)
      await assertFocus(kitchenId, 2)
      assert.equal(await button('Place it').count(), 0)
      assert.equal(await scene().locator('g[opacity="0.78"]').count(), 0)
      assert.equal(await scene().locator('.room-selection').count(), 0)
      assert.equal(await page.locator('.build-panel .sheet').count(), 0)
      const focusBedroom = button('Focus Bedroom')
      await focusBedroom.focus()
      await focusBedroom.press('Enter')
      await assertFocus(bedroomId, 2)
      const data = await snapshot()
      assert.equal(objects(data, bedroomId).length, 1)
      assert.deepEqual(objects(data, kitchenId), kitchenObjects)
    })

    await step('Zoom keeps keyboard focus and supports dragging and faded floor clicks', async () => {
      await button('Zoom in').click()
      const zoomedWidth = (await room(bedroomId).boundingBox()).width
      for (const [name, id] of [['Kitchen', kitchenId], ['Bedroom', bedroomId]]) {
        const label = button(`Focus ${name}`)
        await label.focus()
        await label.press('Enter')
        await assertFocus(id, 2)
        assert.ok(await label.evaluate((element) => element === document.activeElement), 'Room label must keep keyboard focus when switching')
        assert.ok(Math.abs((await room(id).boundingBox()).width - zoomedWidth) < 2, 'Room switch must retain zoom')
      }
      const before = await snapshot()
      const bed = objects(before, bedroomId)[0]
      const art = room(bedroomId).locator(`[data-object-id="${bedId}"]`)
      await art.scrollIntoViewIfNeeded()
      const start = await art.boundingBox()
      // Drop at the centre of the bed's 3x2 footprint, through the actual SVG screen transform.
      const destination = await room(bedroomId).locator('.build-room-svg').evaluate((svg, y) => {
        const point = new DOMPoint(195 + (1.5 - (y + 1)) * 21.25, 130 + (1.5 + y + 1) * 10.625).matrixTransform(svg.getScreenCTM())
        return { x: point.x, y: point.y }
      }, bed.tileY + 1)
      await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
      await page.mouse.down()
      await page.mouse.move(destination.x, destination.y, { steps: 10 })
      await page.mouse.up()
      const after = await saved((data) => assert.equal(objects(data, bedroomId)[0].tileY, bed.tileY + 1), 'Pointer dragging while zoomed must land on the intended tile before the doorway')
      assert.deepEqual(objects(after, kitchenId), kitchenObjects)
      await closeObjectSheet()
      await button('Fit home').click()
      // Find an exposed floor tile using hit-testing so overlaps cannot turn this into a label click.
      const floor = await room(kitchenId).locator('svg[aria-label^="Room with"]').evaluate((svg, roomId) => {
        for (let ty = 7.5; ty > 0; ty--) for (let tx = 0.5; tx < 8; tx++) {
          const point = new DOMPoint(195 + (tx - ty) * 21.25, 130 + (tx + ty) * 10.625).matrixTransform(svg.getScreenCTM())
          const hit = document.elementFromPoint(point.x, point.y)
          if (hit?.closest('[data-room-id]')?.getAttribute('data-room-id') === roomId && hit.closest('svg') === svg && !hit.closest('[data-object-id]')) return { x: point.x, y: point.y }
        }
        return null
      }, kitchenId)
      assert.ok(floor, 'An exposed inactive floor must accept pointer input')
      await page.mouse.click(floor.x, floor.y)
      await assertFocus(kitchenId, 2)
      assert.equal(await scene().locator('g[opacity="0.78"]').count(), 0)
      await button('Focus Bedroom').click()
    })

    await step('Chore editor offers objects from every room', async () => {
      await navigate('Home')
      assert.equal(await scene().locator('.room-pet').count(), 1)
      await button('Add a chore').click()
      const options = await page.getByRole('combobox', { name: 'Where is it?', exact: true }).locator('option').evaluateAll((options) => options.map((option) => ({ value: option.value, text: option.textContent })))
      for (const object of [...kitchenObjects, { id: bedId }]) assert.ok(options.some((option) => option.value === object.id), `Chore locations must include object ${object.id}`)
      assert.match(options.find((option) => option.value === bedId).text, /Bed/)
      await button('Cancel').click()
      await focusSelect().selectOption(kitchenId)
      const before = await snapshot()
      const bedChore = Object.values(before.tables.chores).find((chore) => chore.objectId === bedId && chore.name === 'Make the bed')
      assert.ok(bedChore, 'The bedroom bed must have its default chore')
      await page.locator('.home-chores').getByRole('button', { name: `Edit ${bedChore.name}`, exact: true }).click()
      assert.equal(await page.getByRole('combobox', { name: 'Where is it?', exact: true }).inputValue(), bedId)
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Make the bed before breakfast')
      await button('Save').click()
      await saved((data) => {
        assert.equal(data.tables.chores[bedChore.id].name, 'Make the bed before breakfast')
        assert.equal(data.tables.chores[bedChore.id].objectId, bedId)
      }, 'Editing a bedroom chore while Kitchen is focused must preserve its object link')
    })

    await step('Wall and floor edits affect only the focused room', async () => {
      // Earn styles via the existing demo clock and chore UI, without writing test fixtures.
      for (let day = 0; day < 4; day++) {
        if (day) await nextDay()
        await finishDueChores()
      }
      await saved((data) => {
        const progress = Object.values(data.tables.progress)[0]
        assert.ok(progress.unlockedItems.includes('wall:mint'))
        assert.ok(progress.unlockedItems.includes('floor:tile'))
      }, 'Four days of completed chores must unlock Mint and Tile')
      assert.equal(await scene().locator('.home-scene-bubble').count(), 1, 'Completed chore should prompt a pet response')
      await navigate('Build')
      await navigate('Home')
      assert.equal(await scene().locator('.home-scene-bubble').count(), 0, 'Returning Home must not replay the previous completion response')
      await navigate('Build')
      await focusSelect().selectOption(bedroomId)
      await assertFocus(bedroomId, 2)
      const before = await snapshot()
      await page.getByRole('region', { name: 'Room style', exact: true }).getByRole('button', { name: 'Mint', exact: true }).click()
      await page.getByRole('region', { name: 'Room style', exact: true }).getByRole('button', { name: 'Tile', exact: true }).click()
      const after = await saved((data) => {
        assert.equal(data.tables.rooms[bedroomId].wallStyle, 'mint')
        assert.equal(data.tables.rooms[bedroomId].floorStyle, 'tile')
      }, 'Bedroom style must be saved')
      assert.deepEqual(after.tables.rooms[kitchenId], before.tables.rooms[kitchenId])
      assert.match(await room(bedroomId).locator('svg[aria-label^="Room with"]').getAttribute('aria-label'), /tile floor and mint walls/)
      assert.match(await room(kitchenId).locator('svg[aria-label^="Room with"]').getAttribute('aria-label'), /wood floor and peach walls/)
      await button('Focus Kitchen').click()
      assert.equal(await button('Peach').getAttribute('aria-pressed'), 'true')
      assert.equal(await button('Wood').getAttribute('aria-pressed'), 'true')
      await button('Focus Bedroom').click()
    })

    await step('Build navigation, focus, room objects, and styles survive reload', async () => {
      await page.reload({ waitUntil: 'networkidle' })
      await button('Collapse time panel').click()
      assert.equal(new URL(page.url()).searchParams.get('screen'), 'build', 'Reload must preserve the current Build screen')
      await assertFocus(bedroomId, 2)
      assert.equal(await scene().locator('.ch-breathe').count(), 1, 'The Build preview must draw exactly one pet')
      assert.equal(await room(bedroomId).locator(`[data-object-id="${bedId}"]`).count(), 1)
      assert.equal(await room(kitchenId).locator('[data-object-id]').count(), kitchenObjects.length)
      assert.match(await room(bedroomId).locator('svg[aria-label^="Room with"]').getAttribute('aria-label'), /tile floor and mint walls/)
      await navigate('Home')
      await assertPetAt(bedroomId)
      await keyboardFocusRoom(kitchenId)
      await assertFocus(kitchenId, 2)
      assert.equal(await scene().locator('.room-pet').count(), 1)
      await button('Focus Bedroom').click()
    })

    await step('Share preview uses the selected bedroom objects and style', async () => {
      await navigate('Home')
      await focusSelect().selectOption(bedroomId)
      const style = await roomStyle(room(bedroomId).locator('svg[aria-label^="Room with"]'))
      await navigate('More')
      await button('Share your home').click()
      await eventually(async () => assert.equal(await page.locator('.share-status').getAttribute('data-state'), 'ready'), 'Share preview must finish rendering')
      const preview = page.locator('.share-card svg[role="presentation"]')
      assert.equal(await preview.locator('[data-object-id]').count(), 1)
      assert.equal(await preview.locator(`[data-object-id="${bedId}"]`).count(), 1)
      // The share card frames a single room; its outer walls differ from shared partitions.
      assert.deepEqual(await roomStyle(preview), style, 'Share preview floor pattern and wall colours must match the focused bedroom')
      await page.screenshot({ path: join(output, 'bedroom-share.png'), fullPage: true })
      await button('Back').click()
    })

    await step('Duplicate room names are numbered, all room types fit, and the six-room limit is respected', async () => {
      await navigate('Build')
      await addRoom('Bathroom')
      await page.setViewportSize({ width: 390, height: 844 })
      await focusSelect().selectOption(bedroomId)
      await navigate('Home')
      await button('Fit home').click()
      await assertFocus(bedroomId, 3)
      await page.screenshot({ path: join(output, '390-three-rooms-home.png'), fullPage: true })
      await focusSelect().selectOption(kitchenId)
      await assertFocus(kitchenId, 3)
      await assertPetAt(kitchenId)
      await assertDoorTargets()
      await page.screenshot({ path: join(output, '390-three-rooms-kitchen.png'), fullPage: true })
      await page.setViewportSize({ width: 1440, height: 1000 })
      await focusSelect().selectOption(kitchenId)
      await assertFocus(kitchenId, 3)
      await assertPetAt(kitchenId)
      await page.screenshot({ path: join(output, 'desktop-three-rooms-home.png'), fullPage: true })
      await navigate('Build')
      const duplicate = await addRoom('Bedroom')
      assert.notEqual(duplicate, bedroomId)
      assert.equal(await focusSelect().locator('option:checked').textContent(), 'Bedroom 2')
      for (const type of ['Living room', 'Room']) await addRoom(type)
      assert.equal(await focusSelect().locator('option:checked').textContent(), 'Room')
      await assertFocus(await focusSelect().inputValue(), maxRooms)
      await saved((data) => assert.equal(Object.keys(data.tables.rooms).length, maxRooms), 'All six rooms must be saved')
      assert.equal(new Set(await focusSelect().locator('option').allTextContents()).size, maxRooms)
      assert.equal(await button('Add room').count(), 0, 'The home must not offer a seventh room')
    })

    await step('Desktop and phone layouts keep rooms visible without page overflow', async () => {
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport)
        for (const view of ['Build', 'Home']) {
          await navigate(view)
          await button('Fit home').click()
          await assertFocus(await focusSelect().inputValue(), maxRooms)
          await eventually(assertNoOverflow, `${view} must fit a ${viewport.width}px viewport`)
          await eventually(assertLabelsFit, `Room labels must fit ${viewport.width}x${viewport.height}`)
          await eventually(assertFadedInactive, 'Inactive rooms must be faded')
          await assertDoorTargets()
          if (view === 'Home') {
            assert.equal(await scene().locator('.room-pet').count(), 1)
            const target = scene().locator('.room-pet > rect[fill="transparent"]')
            const hit = await target.boundingBox()
            assert.ok(hit.width >= 43.9 && hit.height >= 43.9, `Pet tap target must be at least 44px: ${JSON.stringify(hit)}`)
            await target.click()
            const bubble = scene().locator('.home-scene-bubble')
            await bubble.waitFor({ state: 'visible' })
            assert.ok(await bubble.evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 13), 'Pet text must remain at least 13px')
            assert.equal(await scene().locator('.home-scene-world .home-scene-bubble').count(), 0, 'Pet text must be outside the scaled world')
          }
          const first = rooms().first()
          const before = (await first.boundingBox()).width
          await button('Zoom in').click()
          await eventually(async () => assert.ok((await first.boundingBox()).width > before), 'Zoom in must enlarge rooms')
          await button('Zoom out').click()
          await button('Fit home').click()
          await eventually(async () => assert.ok(Math.abs((await first.boundingBox()).width - before) < 2), 'Fit home must restore the room scale')
          await page.screenshot({ path: join(output, `${viewport.width}-${view.toLowerCase()}.png`), fullPage: true })
        }
      }
    })
  }
  await step('Existing doorway obstruction keeps the pet in place until the furniture is moved', blockedDoorRecovery)
  assert.deepEqual(errors, [], 'Browser must not emit uncaught JavaScript errors')
  await writeFile(join(output, 'result.json'), JSON.stringify({ passed: true, steps, errors }, null, 2))
  console.log(`PASS ${steps.length} multiroom checks. Screenshots and result: ${output}`)
} catch (error) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {})
  await writeFile(join(output, 'result.json'), JSON.stringify({ passed: false, steps, errors, failure: error.stack, cause: error.cause?.stack }, null, 2))
  console.error(error)
  console.error(`Failure screenshot and result: ${output}`)
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
}
