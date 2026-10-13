import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
const out = process.env.CHORE_GREET_FOLLOW_CAPTURE_DIR
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

const readFeet = node => ['left', 'right'].map(side => {
  const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
  const point = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
    .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
  return { x: point.x, y: point.y }
})

for (const { species, selector, limit, speed, visible, lean } of [
  { species: 'mochi', selector: '[data-appendage="knot"] > g', limit: 2.76, speed: 20, visible: 1.4, lean: -2.46 },
  { species: 'bun', selector: '[data-appendage="left-ear"]', limit: 7.21, speed: 51, visible: 4.8, lean: -3 },
  { species: 'sprout', selector: '[data-appendage="stem"]', limit: 1.805, speed: 13, visible: 1, lean: -2.16 },
]) {
  test(`${species} greets the player with one restrained appendage sway`, async t => {
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
          saved.tables.placed_objects = {}
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
      window.__greetFrames = new Set()
      window.requestAnimationFrame = callback => {
        const id = request(now => { window.__greetFrames.delete(id); window.__greetLastFrame = now; callback(now) })
        window.__greetFrames.add(id)
        return id
      }
      window.cancelAnimationFrame = id => { window.__greetFrames.delete(id); cancel(id) }
    })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const saved = (await snapshot(page)).tables
    await resident.evaluate(node => { window.__greetPet = node })
    await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
    const wave = page.getByRole('button', { name: 'Wave', exact: true })
    await wave.focus(); await page.keyboard.press('Enter')
    const live = page.locator('.living-room [aria-live="polite"]'), heard = (await live.textContent()).trim()
    assert.ok(heard, 'native player Wave starts the resident greeting announcement')
    // Past the existing120ms join;61 delivered SVG samples over960ms end
    // before the1200ms greeting expiry. No furniture orientation is involved.
    await page.clock.runFor(160)
    const position = await resident.getAttribute('transform'), feet = await resident.evaluate(readFeet), samples = []
    for (let elapsed = 160; elapsed <= 1120; elapsed += 16) {
      const sample = await resident.evaluate((node, selector) => {
        const part = node.querySelector(selector), matrix = part.transform.baseVal.consolidate().matrix
        return { time: window.__greetLastFrame, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
          lean: Number(node.querySelector('[data-character-body]').getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]),
          arms: [...node.querySelectorAll('[data-arm]')].map(n => Number(n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])),
          frames: window.__greetFrames.size }
      }, selector)
      samples.push(sample)
      assert.equal(sample.frames, 1)
      assert.ok(sample.arms[0] >= 0 && sample.arms[0] <= 5.00001, 'the original low arm gesture remains within its range')
      sample.position = await resident.getAttribute('transform')
      assert.equal(sample.position, position)
      const current = await resident.evaluate(readFeet)
      sample.feet = current
      current.forEach((p,i) => assert.ok(Math.hypot(p.x - feet[i].x, p.y - feet[i].y) < .01, 'player greeting keeps actual foot contacts fixed'))
      if (out && elapsed === 480) {
        await mkdir(out, { recursive: true })
        await page.screenshot({ path: join(out, `greet-follow-${species}.png`) })
      }
      if (elapsed < 1120) await page.clock.runFor(16)
    }
    const peak = Math.max(...samples.map(x => Math.abs(x.angle)))
    const maxFootDrift = Math.max(...samples.flatMap(sample => sample.feet.map((p,i) => Math.hypot(p.x-feet[i].x,p.y-feet[i].y))))
    const observedSpeed = Math.max(...samples.slice(1).map((x,i) => x.time > samples[i].time ? Math.abs(x.angle - samples[i].angle) / (x.time - samples[i].time) * 1000 : 0))
    t.diagnostic(`${species}: peak ${peak.toFixed(3)}deg, speed ${observedSpeed.toFixed(3)}deg/s; ${samples.length} actual SVG/RAF-time samples within actual player greeting`)
    if (out) {
      await mkdir(out, { recursive: true })
      await writeFile(join(out, `greet-follow-${species}.json`), JSON.stringify({ species, samples, peak, observedSpeed, maxFootDrift, position, feet,
        method: 'Actual keyboard player Wave; wait160ms past120ms join, then61 SVG/RAF-time samples at16ms over960ms through approximately1120ms before1200ms expiry. PNG near480ms waving pose. Sprout measures actual stem angle, not full leaf transform.' }, null, 2)+'\n')
    }
    t.diagnostic(`lean range ${Math.min(...samples.map(x => x.lean))}..${Math.max(...samples.map(x => x.lean))}; waving ${Math.min(...samples.map(x => x.arms[1]))}`)
    assert.ok(Math.abs(Math.min(...samples.map(x => x.lean)) - lean) < .00001, 'player-greeting primary lean matches the measured existing baseline')
    assert.ok(samples.some(x => x.arms[1] < -8), 'the original waving arm remains visible')
    assert.ok(peak <= limit && peak > visible, 'actual appendage retains one small visible greeting sway')
    assert.ok(observedSpeed < speed, 'actual player greeting follow-through stays within speed budget')
    const signs = samples.filter(x => Math.abs(x.angle) > 1e-6).map(x => Math.sign(x.angle))
    assert.equal(signs.filter((sign,i) => i > 0 && sign !== signs[i-1]).length, 1)
    assert.equal(await resident.evaluate(node => node === window.__greetPet), true)
    assert.equal((await live.textContent()).trim(), heard)
    assert.deepEqual((await snapshot(page)).tables, saved)
    await page.clock.runFor(320)
    assert.equal(await page.evaluate(() => window.__greetFrames.size), 1, 'healthy idle retains its existing single clock after the finite greeting')
    const arms = await resident.locator('[data-arm]').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])))
    assert.ok(arms.every(value => Math.abs(value) < .00001), 'finite player greeting hands off to the unchanged quiet idle')
    assert.deepEqual((await snapshot(page)).tables, saved)
    await changeReducedMotion(page, 'reduce')
    await page.clock.runFor(160)
    assert.equal(await page.evaluate(() => window.__greetFrames.size), 0, 'reduced idle stops the existing clock after greeting and attention settle')
    assert.deepEqual((await snapshot(page)).tables, saved)
  })
}
