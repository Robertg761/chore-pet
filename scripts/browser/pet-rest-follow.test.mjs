import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'


const readFeet = node => ['left', 'right'].map(side => {
  const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
  const point = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
    .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
  return { x: point.x, y: point.y }
})

for (const { species, selector, limit, factor } of [
  { species: 'mochi', selector: '[data-appendage="knot"] > g', limit: 1.25, factor: 1 },
  { species: 'bun', selector: '[data-appendage="left-ear"]', limit: 3.6, factor: 1 },
  { species: 'sprout', selector: '[data-appendage="stem"]', limit: 2.25, factor: .4 },
]) {
  test(`${species} settles into one quiet environmental rest sway on the resident clock`, async t => {
    const page = await browserApp(t, { reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } })
    await page.evaluate(species => new Promise((resolve, reject) => {
      const request = indexedDB.open('chore-pet', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv')
        const read = store.get('snapshot')
        read.onsuccess = () => {
          const saved = read.result, pet = Object.values(saved.tables.pets)[0]
          pet.species = species
          const room = Object.values(saved.tables.rooms)[0]
          saved.tables.placed_objects = { 'rest-rug': { id: 'rest-rug', roomId: room.id, catalogId: 'rug', tileX: 5, tileY: 5, rotation: 0 } }
          saved.tables.chores = {}
          saved.tables.completions = {}
          pet.equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
          saved.outbox = {}
          store.put(saved, 'snapshot')
        }
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
    }), species)
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 1000)
    await page.addInitScript(() => {
      Math.random = () => .99
      const request = requestAnimationFrame, cancel = cancelAnimationFrame
      window.__restFrames = new Set()
      window.requestAnimationFrame = callback => {
        const id = request(now => { window.__restFrames.delete(id); callback(now) })
        window.__restFrames.add(id)
        return id
      }
      window.cancelAnimationFrame = id => { window.__restFrames.delete(id); cancel(id) }
    })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const saved = (await snapshot(page)).tables
    await resident.evaluate(node => { window.__restPet = node })
    await page.getByRole('button', { name: 'Explore together', exact: true }).click()
    await page.getByLabel(/^Show /).selectOption('rest-rug')
    await page.getByRole('button', { name: 'Look together', exact: true }).click()
    const live = page.locator('.living-room [aria-live="polite"]')
    let heard = ''
    for (let i = 0; i < 150 && !heard; i++) {
      await page.clock.runFor(100)
      heard = (await live.textContent()).trim()
    }
    assert.ok(['Little dots around a cosy middle.', 'I like that little flower on the rug.'].includes(heard), 'the resident arrives at the selected rug')
    // Allow the360ms orientation and outgoing120ms blend to finish before
    // measuring the middle of the finite rest. Arrival polling may overshoot
    // one100ms step; stop before its recovery can hand back to ambient idle.
    await page.clock.runFor(360 + 360)
    const position = await resident.getAttribute('transform')
    const feet = await resident.evaluate(readFeet)
    const angles = []
    for (let elapsed = 360; elapsed <= 2040; elapsed += 32) {
      angles.push(await resident.evaluate((node, { selector, species, factor }) => {
        const part = node.querySelector(selector), matrix = part.transform.baseVal.consolidate().matrix
        const pose = node.querySelector('[data-character-pose]').dataset.characterPose
        const posture = species === 'mochi' ? pose === 'scruffy' ? 38 : ['meh', 'content'].includes(pose) ? 16 : 0 : 0
        return (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI - posture) / factor
      }, { selector, species, factor }))
      assert.equal(await page.evaluate(() => window.__restFrames.size), 1)
      assert.equal(await resident.getAttribute('transform'), position)
      const currentFeet = await resident.evaluate(readFeet)
      for (let i = 0; i < 2; i++) assert.ok(Math.hypot(currentFeet[i].x - feet[i].x, currentFeet[i].y - feet[i].y) < .01, 'actual rest foot contacts stay grounded')
      await page.clock.runFor(32)
    }
    assert.ok(Math.max(...angles.map(Math.abs)) <= limit + 1e-6, 'actual appendage must stay inside quiet-rest angle budget')
    assert.ok(Math.max(...angles.map(Math.abs)) > .25, 'normal motion must visibly respond')
    const signs = angles.filter(angle => Math.abs(angle) > 1e-6).map(Math.sign)
    assert.equal(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1]).length, 1, 'actual appendage must make one quiet sway')
    assert.equal(await resident.evaluate(node => node === window.__restPet), true)
    assert.equal((await live.textContent()).trim(), heard)
    assert.deepEqual((await snapshot(page)).tables, saved)
    t.diagnostic(`Chromium ${page.context().browser().version()}; ${angles.length} actual SVG-angle samples; selected rug/rest; actual foot contacts<.01local SVGunits; one resident clock; unchanged position/node/announcement/saved tables`)
  })
}
