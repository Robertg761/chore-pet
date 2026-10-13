import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
const out = process.env.CHORE_WAVE_FOLLOW_CAPTURE_DIR
import { browserApp, snapshot } from './helpers.mjs'

const readFeet = node => ['left', 'right'].map(side => {
  const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
  const point = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
    .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
  return { x: point.x, y: point.y }
})

for (const { species, selector, limit, speed, visible, lean } of [
  { species: 'mochi', selector: '[data-appendage="knot"] > g', limit: 2.01, speed: 13, visible: .9, lean: 3.28 },
  { species: 'bun', selector: '[data-appendage="left-ear"]', limit: 5.41, speed: 34, visible: 3, lean: 4 },
  { species: 'sprout', selector: '[data-appendage="stem"]', limit: 1.265, speed: 8.5, visible: .7, lean: 2.88 },
]) {
  test(`${species} waves toward a plant with one restrained appendage sway`, async t => {
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
          saved.tables.placed_objects = { 'wave-plant': { id: 'wave-plant', roomId: room.id, catalogId: 'plant', tileX: 5, tileY: 5, rotation: 0 } }
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
      window.__waveFrames = new Set()
      window.requestAnimationFrame = callback => {
        const id = request(now => { window.__waveFrames.delete(id); window.__waveLastFrame = now; callback(now) })
        window.__waveFrames.add(id)
        return id
      }
      window.cancelAnimationFrame = id => { window.__waveFrames.delete(id); cancel(id) }
    })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const saved = (await snapshot(page)).tables
    await resident.evaluate(node => { window.__wavePet = node })
    await page.getByRole('button', { name: 'Explore together', exact: true }).click()
    await page.getByRole('combobox', { name: /^Show / }).selectOption('wave-plant')
    await page.getByRole('button', { name: 'Look together', exact: true }).click()
    const live = page.locator('.living-room [aria-live="polite"]')
    let heard = ''
    for (let i = 0; i < 1000 && !heard; i++) {
      await page.clock.runFor(16)
      heard = (await live.textContent()).trim()
    }
    assert.ok(heard.trim(), 'actual invited plant arrival starts the furniture orientation')
    // Allow the 360ms orientation and its next 16ms frame before the action.
    // At 512ms after announced arrival, plant wave is 136..168ms old, beyond
    // its 120ms join. 73 samples span 1152ms and end before the 1400ms expiry.
    await page.clock.runFor(512)
    const position = await resident.getAttribute('transform'), feet = await resident.evaluate(readFeet), samples = []
    for (let elapsed = 128; elapsed <= 1280; elapsed += 16) {
      const sample = await resident.evaluate((node, selector) => {
        const part = node.querySelector(selector), matrix = part.transform.baseVal.consolidate().matrix
        return { time: window.__waveLastFrame, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
          lean: Number(node.querySelector('[data-character-body]').getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]),
          arms: [...node.querySelectorAll('[data-arm]')].map(n => Number(n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])),
          frames: window.__waveFrames.size }
      }, selector)
      samples.push(sample)
      assert.equal(sample.frames, 1)
      assert.ok(Math.abs(sample.arms[0]) < .00001, 'plant wave keeps the unraised arm neutral')
      sample.position = await resident.getAttribute('transform')
      assert.equal(sample.position, position)
      const current = await resident.evaluate(readFeet)
      sample.feet = current
      current.forEach((p,i) => assert.ok(Math.hypot(p.x - feet[i].x, p.y - feet[i].y) < .01, 'plant wave keeps actual foot contacts fixed'))
      if (out && elapsed === 720) {
        await mkdir(out, { recursive: true })
        await page.screenshot({ path: join(out, `wave-follow-${species}.png`) })
      }
      if (elapsed < 1280) await page.clock.runFor(16)
    }
    const peak = Math.max(...samples.map(x => Math.abs(x.angle)))
    const maxFootDrift = Math.max(...samples.flatMap(sample => sample.feet.map((p,i) => Math.hypot(p.x-feet[i].x,p.y-feet[i].y))))
    const observedSpeed = Math.max(...samples.slice(1).map((x,i) => x.time > samples[i].time ? Math.abs(x.angle - samples[i].angle) / (x.time - samples[i].time) * 1000 : 0))
    t.diagnostic(`${species}: peak ${peak.toFixed(3)}deg, speed ${observedSpeed.toFixed(3)}deg/s; ${samples.length} actual SVG/RAF-time samples within actual plant wave`)
    if (out) {
      await mkdir(out, { recursive: true })
      await writeFile(join(out, `wave-follow-${species}.json`), JSON.stringify({ species, samples, peak, observedSpeed, maxFootDrift, position, feet,
        method: 'Actual invited plant wave; wait 512ms after announced orientation arrival, giving action-relative 136..168ms after its 120ms join. 73 SVG/RAF-time samples at 16ms over 1152ms end at 1288..1320ms, before 1400ms action expiry. PNG at label 720ms, approximately action 728..760ms during the waving pose. Sprout measures the actual stem angle, not the full leaf transform.' }, null, 2)+'\n')
    }
    t.diagnostic(`lean range ${Math.min(...samples.map(x => x.lean))}..${Math.max(...samples.map(x => x.lean))}; waving ${Math.min(...samples.map(x => x.arms[1]))}`)
    assert.ok(Math.abs(Math.max(...samples.map(x => x.lean)) - lean) < .00001, 'plant-wave primary lean matches the measured existing baseline')
    assert.ok(samples.some(x => x.arms[1] < -8), 'the original waving arm remains visible')
    assert.ok(peak <= limit && peak > visible, 'actual appendage retains one small visible wave sway')
    assert.ok(observedSpeed < speed, 'actual plant wave follow-through stays within speed budget')
    const signs = samples.filter(x => Math.abs(x.angle) > 1e-6).map(x => Math.sign(x.angle))
    assert.equal(signs.filter((sign,i) => i > 0 && sign !== signs[i-1]).length, 1)
    assert.equal(await resident.evaluate(node => node === window.__wavePet), true)
    assert.equal((await live.textContent()).trim(), heard)
    assert.deepEqual((await snapshot(page)).tables, saved)
    await page.clock.runFor(192)
    assert.equal(await page.evaluate(() => window.__waveFrames.size), 1)
    const arms = await resident.locator('[data-arm]').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])))
    assert.ok(arms.every(value => Math.abs(value) < .00001), 'finite plant wave hands off to the unchanged quiet settlement')
    assert.deepEqual((await snapshot(page)).tables, saved)
  })
}
