import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

function read(node) {
  const arm = node.querySelector('[data-arm="right"]').transform.baseVal.consolidate().matrix
  return {
    time: window.__dustTime,
    angle: Math.atan2(arm.b, arm.a) * 180 / Math.PI,
    position: node.getAttribute('transform'),
    frames: window.__dustFrames.size,
    feet: ['left', 'right'].map(side => {
      const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
      const point = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
        .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
      return { x: point.x, y: point.y }
    }),
  }
}

for (const { species, speed, peak, minimum, reversals, reduced = false } of [
  { species: 'mochi', speed: 105, peak: 22, minimum: 18, reversals: 1 },
  { species: 'bun', speed: 140, peak: 28, minimum: 24, reversals: 3 },
  { species: 'sprout', speed: 90, peak: 19, minimum: 15.5, reversals: 1 },
  { species: 'mochi', reduced: true },
]) test(`${species} reacts to an actually dusty bookshelf${reduced ? ' without moving in reduced motion' : ' with a grounded deliberate hand gesture'}`, async t => {
  const page = await browserApp(t, { reducedMotion: reduced ? 'reduce' : 'no-preference', viewport: { width: 1280, height: 800 } })
  await page.evaluate(species => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), load = store.get('snapshot')
      load.onsuccess = () => {
        const saved = load.result, pet = Object.values(saved.tables.pets)[0], room = Object.values(saved.tables.rooms)[0]
        // A brand-new chore's first occurrence has one grace day. Two days
        // back makes this daily task one day late, with actual dusty art.
        const created = new Date(); created.setDate(created.getDate() - 2)
        const date = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
        pet.species = species
        pet.equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
        saved.tables.placed_objects = { 'dust-shelf': { id: 'dust-shelf', roomId: room.id, catalogId: 'bookshelf', tileX: 5, tileY: 5, rotation: 0 } }
        saved.tables.chores = { 'dust-task': { id: 'dust-task', homeId: room.homeId, objectId: 'dust-shelf', name: 'Dust the bookshelf', schedule: { kind: 'daily' }, createdOn: date, photoProof: false } }
        saved.tables.completions = {}; saved.outbox = {}
        store.put(saved, 'snapshot')
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), species)
  await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__dustFrames = new Set(); window.__dustTime = 0
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__dustFrames.delete(id); window.__dustTime = now; callback(now) })
      window.__dustFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__dustFrames.delete(id); cancel(id) }
  })
  await page.reload()
  const resident = page.locator('.room-pet'); await resident.waitFor()
  await page.getByText('1 day late', { exact: true }).waitFor()
  const saved = (await snapshot(page)).tables
  const initial = await resident.evaluate(read), body = await resident.locator('[data-character-body]').innerHTML()
  await resident.evaluate(node => { window.__dustPet = node })
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByRole('combobox', { name: /^Show / }).selectOption('dust-shelf')
  await page.getByRole('button', { name: 'Look together', exact: true }).click()
  const live = page.locator('.living-room [aria-live="polite"]')
  const observations = ['So many colours on those shelves.', 'I wonder what is in that red book.']
  if (reduced) {
    const heard = (await live.textContent()).trim()
    assert.ok(observations.includes(heard), 'lightly dusty decor still receives its existing observation')
    const box = await resident.locator('[data-character-body]').boundingBox()
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 1280 && box.y + box.height <= 800)
    assert.equal(await page.evaluate(() => document.hidden), false)
    assert.equal((await resident.evaluate(read)).frames, 0)
    await page.clock.runFor(2000)
    assert.equal((await resident.evaluate(read)).position, initial.position)
    assert.equal(await resident.locator('[data-character-body]').innerHTML(), body)
    assert.equal((await live.textContent()).trim(), heard)
    await page.clock.runFor(1600)
    assert.equal((await live.textContent()).trim(), '')
    assert.equal((await resident.evaluate(read)).frames, 0)
    assert.deepEqual((await snapshot(page)).tables, saved)
    t.diagnostic('Visible reduced-motion dusty invitation: same position/body,existing3600ms speech lifetime,0resident frames,unchanged saved tables.')
    return
  }
  let heard = ''
  for (let i = 0; i < 150 && !heard; i++) { await page.clock.runFor(100); heard = (await live.textContent()).trim() }
  assert.ok(observations.includes(heard), 'the selected dusty furnishing must receive its invited observation')
  // Arrival polling overshoots by at most100ms. Sample after orientation and
  // its blend, before recovery can hand back to the next activity.
  await page.clock.runFor(360 + 120)
  const first = await resident.evaluate(read), samples = []
  for (let elapsed = 120; elapsed <= 1240; elapsed += 16) {
    const sample = await resident.evaluate(read)
    if (!samples.length || sample.time !== samples.at(-1).time) samples.push(sample)
    assert.equal(sample.frames, 1)
    assert.equal(sample.position, first.position)
    for (let i = 0; i < 2; i++) assert.ok(Math.hypot(sample.feet[i].x - first.feet[i].x, sample.feet[i].y - first.feet[i].y) < .01, 'actual dust reaction feet stay planted')
    if (elapsed === 600 && process.env.CHORE_DUST_HAND_CAPTURE_DIR) {
      await mkdir(process.env.CHORE_DUST_HAND_CAPTURE_DIR, { recursive: true })
      await page.screenshot({ path: join(process.env.CHORE_DUST_HAND_CAPTURE_DIR, `dust-hand-room-${species}.png`), fullPage: false })
    }
    await page.clock.runFor(16)
  }
  const angles = samples.map(sample => sample.angle), changes = samples.slice(1).map((sample, i) => ({ delta: sample.angle - angles[i], ms: sample.time - samples[i].time }))
  const observedSpeed = Math.max(...changes.map(({ delta, ms }) => Math.abs(delta) / ms * 1000)), observedPeak = Math.max(...angles.map(Math.abs))
  t.diagnostic(`Actual ${species} hand peak${observedPeak.toFixed(3)}deg;speed${observedSpeed.toFixed(3)}deg/s`)
  assert.ok(observedSpeed < speed, 'the actual hand must not flutter rapidly')
  assert.ok(observedPeak < peak)
  assert.ok(observedPeak > minimum, 'a dusty response must retain its recognizable hand lift rather than a smaller clean inspection')
  const signs = changes.filter(({ delta }) => Math.abs(delta) > 1e-5).map(({ delta }) => Math.sign(delta))
  assert.equal(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1]).length, reversals)
  assert.equal(await resident.evaluate(node => node === window.__dustPet), true)
  assert.equal((await live.textContent()).trim(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic(`Chromium ${page.context().browser().version()}; ${samples.length} actual SVG hand/timestamp samples; dusty linked chore; planted feet<.01localunits; one resident clock; unchanged position/node/announcement/saved tables`)
})
