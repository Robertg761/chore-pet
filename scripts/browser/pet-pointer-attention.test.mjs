import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

async function chooseSpecies(page, species) {
  await page.evaluate(species => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
      const read = store.get('snapshot')
      read.onsuccess = () => {
        const saved = read.result, pet = Object.values(saved.tables.pets)[0]
        pet.species = species
        pet.equipped = { face: 'glasses' }
        saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), species)
}

function eyesAt(node) {
  const eyes = [...node.querySelectorAll('[data-eye-gaze] ellipse')]
  const centre = shifted => {
    const points = eyes.map(eye => {
      const gaze = eye.closest('[data-eye-gaze]')
      return new DOMPoint(+eye.getAttribute('cx'), +eye.getAttribute('cy'))
        .matrixTransform((shifted ? gaze : gaze.parentElement).getScreenCTM())
    })
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
  }
  return { origin: centre(false), pupil: centre(true),
    open: [...node.querySelectorAll('[data-eye-open]')].every(eye => +eye.dataset.eyeOpen === 1) }
}

for (const species of ['mochi', 'bun', 'sprout']) {
  test(`${species} follows horizontal and vertical pointers from its actual drawn eyes`, async t => {
    const page = await browserApp(t, { reducedMotion: 'no-preference' })
    await chooseSpecies(page, species)
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 1000)
    await page.addInitScript(() => { Math.random = () => .2 })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    await page.clock.runFor(32)
    const saved = (await snapshot(page)).tables
    const position = await resident.getAttribute('transform')
    for (const [dx, dy] of [[3, 0], [0, 2], [-3, -1]]) {
      const before = await resident.evaluate(eyesAt)
      const target = { x: before.origin.x + dx, y: before.origin.y + dy }
      await page.mouse.move(target.x, target.y)
      await page.clock.runFor(320)
      const at = await resident.evaluate(eyesAt)
      assert.ok(at.open, 'pointer samples need visible eye ink')
      const gaze = { x: at.pupil.x - at.origin.x, y: at.pupil.y - at.origin.y }
      const aim = { x: target.x - at.origin.x, y: target.y - at.origin.y }
      assert.ok(gaze.x * aim.x + gaze.y * aim.y > 0, 'actual pupil ink must move toward the pointer')
      const perpendicular = Math.abs(gaze.x * aim.y - gaze.y * aim.x) / Math.hypot(aim.x, aim.y)
      assert.ok(perpendicular < .015, `pointer gaze perpendicular error:${perpendicular}px`)
      assert.equal(await resident.getAttribute('transform'), position, 'attention must leave the resident in place')
    }
    assert.deepEqual((await snapshot(page)).tables, saved)
    t.diagnostic(`Chromium ${page.context().browser().version()}; actual eye ink;3pointer directions; no saved changes`)
  })
}
