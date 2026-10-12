import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

async function attentionFixture(page, species, rotation) {
  await page.evaluate(({ species, rotation }) => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, room = Object.values(saved.tables.rooms)[0], pet = Object.values(saved.tables.pets)[0]
        pet.species = species
        pet.equipped = { face: 'glasses' }
        saved.tables.placed_objects = {
          low: { id: 'low', roomId: room.id, catalogId: 'teddy', tileX: 7, tileY: 7, rotation },
          high: { id: 'high', roomId: room.id, catalogId: 'poster', tileX: rotation ? 4 : 0, tileY: rotation ? 0 : 4, rotation },
        }
        saved.tables.chores = {}
        saved.tables.completions = {}
        saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), { species, rotation })
}

// Measure actual eye ink and its unshifted centre through native SVG matrices.
// Target coordinates come from independently documented object-local iso points.
function readAim(node, { tx, ty }) {
  const eyes = [...node.querySelectorAll('[data-eye-gaze] ellipse')]
  const centre = (shifted) => {
    const points = eyes.map(eye => {
      const gaze = eye.closest('[data-eye-gaze]')
      return new DOMPoint(+eye.getAttribute('cx'), +eye.getAttribute('cy'))
        .matrixTransform((shifted ? gaze : gaze.parentElement).getScreenCTM())
    })
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
  }
  const origin = centre(false), shifted = centre(true)
  const target = new DOMPoint(195 + (tx - ty) * 21.25, 130 + (tx + ty) * 10.625)
    .matrixTransform(node.ownerSVGElement.getScreenCTM())
  const aim = { x: target.x - origin.x, y: target.y - origin.y }
  const gaze = { x: shifted.x - origin.x, y: shifted.y - origin.y }
  return { dot: gaze.x * aim.x + gaze.y * aim.y,
    perpendicular: Math.abs(gaze.x * aim.y - gaze.y * aim.x) / Math.hypot(aim.x, aim.y),
    vertical: gaze.y, open: [...node.querySelectorAll('[data-eye-open]')].every(eye => +eye.dataset.eyeOpen === 1) }
}

for (const species of ['mochi', 'bun', 'sprout']) for (const rotation of [0, 1]) {
  test(`${species} aims at low and high furnishings through actual mirrored SVG transforms, rotation ${rotation}`, async t => {
    const page = await browserApp(t, { reducedMotion: 'no-preference' })
    await attentionFixture(page, species, rotation)
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 1000)
    await page.addInitScript(() => { Math.random = () => .99 })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const before = (await snapshot(page)).tables
    await page.getByRole('button', { name: 'Explore together', exact: true }).click()
    const live = page.locator('.living-room [aria-live="polite"]')
    for (const id of ['low', 'high']) {
      await page.getByLabel(/^Show /).selectOption(id)
      await page.getByRole('button', { name: 'Look together', exact: true }).click()
      let heard = ''
      for (let i = 0; i < 150 && !heard; i++) {
        await page.clock.runFor(100)
        heard = (await live.textContent()).trim()
      }
      assert.ok(heard, 'invited resident must arrive and announce the selected furnishing')
      await page.clock.runFor(360 + 750)
      const target = id === 'low' ? { tx: 6.75, ty: 6.75 }
        : rotation ? { tx: 1.875, ty: -2.625 } : { tx: -2.625, ty: 1.875 }
      let aim = await resident.evaluate(readAim, target)
      for (let i = 0; i < 12 && !aim.open; i++) {
        await page.clock.runFor(16)
        aim = await resident.evaluate(readAim, target)
      }
      assert.ok(aim.open, 'sample an open-eye moment within the finite inspection')
      assert.ok(aim.dot > 0, 'eye ink must move toward the selected detail')
      assert.ok(aim.perpendicular < .005, `${id} gaze must follow the actual screen direction; perpendicular error ${aim.perpendicular}px`)
      assert.ok(id === 'low' ? aim.vertical > 0 : aim.vertical < 0, 'a low detail looks down; overhead wall art looks up')
    }
    assert.deepEqual((await snapshot(page)).tables, before)
    t.diagnostic(`Chromium ${page.context().browser().version()}; actual eye ink/native SVG matrices; low and high; no saved changes`)
  })
}
