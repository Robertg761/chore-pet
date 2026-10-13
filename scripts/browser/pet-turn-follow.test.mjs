import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
const out = process.env.CHORE_TURN_FOLLOW_CAPTURE_DIR
import { browserApp, snapshot } from './helpers.mjs'


const readFeet = node => ['left', 'right'].map(side => {
  const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
  const point = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
    .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
  return { x: point.x, y: point.y }
})

for (const { species, selector, limit, speed, visible } of [
  { species: 'mochi', selector: '[data-appendage="knot"] > g', limit: .51, speed: 7.5, visible: .3 },
  { species: 'bun', selector: '[data-appendage="left-ear"]', limit: 1.45, speed: 21, visible: 1 },
  { species: 'sprout', selector: '[data-appendage="stem"]', limit: .365, speed: 5.5, visible: .2 },
]) {
  test(`${species} orients toward a furnishing with one small appendage deflection`, async t => {
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
          saved.tables.placed_objects = { 'turn-rug': { id: 'turn-rug', roomId: room.id, catalogId: 'rug', tileX: 5, tileY: 5, rotation: 0 } }
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
      window.__turnFrames = new Set()
      window.requestAnimationFrame = callback => {
        const id = request(now => { window.__turnFrames.delete(id); window.__turnLastFrame = now; callback(now) })
        window.__turnFrames.add(id)
        return id
      }
      window.cancelAnimationFrame = id => { window.__turnFrames.delete(id); cancel(id) }
    })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const saved = (await snapshot(page)).tables
    await resident.evaluate(node => { window.__turnPet = node })
    await page.getByRole('button', { name: 'Explore together', exact: true }).click()
    await page.getByRole('combobox', { name: /^Show / }).selectOption('turn-rug')
    await page.getByRole('button', { name: 'Look together', exact: true }).click()
    const live = page.locator('.living-room [aria-live="polite"]')
    let heard = ''
    for (let i = 0; i < 1000 && !heard; i++) {
      await page.clock.runFor(16)
      heard = (await live.textContent()).trim()
    }
    assert.ok(['Little dots around a cosy middle.', 'I like that little flower on the rug.'].includes(heard), 'actual invited arrival starts the furniture orientation')
    // Polling can overshoot arrival by at most16ms. Exclude the outgoing120ms
    // walk blend, then stop before the unchanged360ms orientation completes.
    await page.clock.runFor(128)
    const position = await resident.getAttribute('transform'), feet = await resident.evaluate(readFeet), samples = []
    for (let elapsed = 128; elapsed <= 320; elapsed += 16) {
      const sample = await resident.evaluate((node, selector) => {
        const part = node.querySelector(selector), matrix = part.transform.baseVal.consolidate().matrix
        return { time: window.__turnLastFrame, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
          lean: Number(node.querySelector('[data-character-body]').getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]),
          arms: [...node.querySelectorAll('[data-arm]')].map(n => Number(n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])),
          frames: window.__turnFrames.size }
      }, selector)
      samples.push(sample)
      assert.equal(sample.frames, 1)
      assert.ok(sample.arms.every(value => Math.abs(value) < .00001), 'samples precede the furniture-action arm gesture')
      sample.position = await resident.getAttribute('transform')
      assert.equal(sample.position, position)
      const current = await resident.evaluate(readFeet)
      sample.feet = current
      current.forEach((p,i) => assert.ok(Math.hypot(p.x - feet[i].x, p.y - feet[i].y) < .01, 'orientation keeps actual foot contacts fixed'))
      if (elapsed < 320) await page.clock.runFor(16)
    }
    const peak = Math.max(...samples.map(x => Math.abs(x.angle)))
    const maxFootDrift = Math.max(...samples.flatMap(sample => sample.feet.map((p,i) => Math.hypot(p.x-feet[i].x,p.y-feet[i].y))))
    const observedSpeed = Math.max(...samples.slice(1).map((x,i) => x.time > samples[i].time ? Math.abs(x.angle - samples[i].angle) / (x.time - samples[i].time) * 1000 : 0))
    t.diagnostic(`${species}: peak${peak.toFixed(3)}deg, speed${observedSpeed.toFixed(3)}deg/s; ${samples.length}actual SVG/RAF-time samples within orientation`)
    assert.ok(samples.some(x => x.lean < -3), 'primary orientation lean remains visible')
    assert.ok(peak <= limit && peak > visible, 'actual appendage retains a small visible orientation deflection')
    assert.ok(observedSpeed < speed, 'actual orientation follow-through stays within speed budget')
    const signs = samples.filter(x => Math.abs(x.angle) > 1e-6).map(x => Math.sign(x.angle))
    assert.equal(signs.filter((sign,i) => i > 0 && sign !== signs[i-1]).length, 0)
    assert.equal(await resident.evaluate(node => node === window.__turnPet), true)
    assert.equal((await live.textContent()).trim(), heard)
    assert.deepEqual((await snapshot(page)).tables, saved)
    if (out) {
      await mkdir(out, { recursive: true })
      await page.screenshot({ path: join(out, `turn-follow-${species}.png`) })
      await writeFile(join(out, `turn-follow-${species}.json`), JSON.stringify({ species, samples, peak, observedSpeed, maxFootDrift, position, feet,
        method: 'Actual invited-rug orientation, after128ms to exclude120ms walk blend,13SVG/RAF-time samples ending320ms plus at most16ms arrival polling; before360ms orientation end. Sprout measures actual stem angle,not full leaf transform.' }, null, 2)+'\n')
    }
    await page.clock.runFor(700)
    assert.equal(await page.evaluate(() => window.__turnFrames.size), 1)
    const arms = await resident.locator('[data-arm]').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])))
    assert.ok(arms[0] < -2 && arms[1] > 2, 'orientation hands off to the unchanged finite Rest gesture')
    assert.deepEqual((await snapshot(page)).tables, saved)
  })
}
