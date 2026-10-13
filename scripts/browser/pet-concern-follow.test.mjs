import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

function read(node) {
  const target = node.querySelector('[data-appendage="left-ear"]')
    ?? node.querySelector('[data-appendage="stem"]')
    ?? node.querySelector('[data-appendage="knot"] > g')
  const matrix = target.transform.baseVal.consolidate().matrix
  return {
    time: window.__concernTime,
    angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
    position: node.getAttribute('transform'),
    pose: node.querySelector('.ch-animated').getAttribute('data-character-pose'),
    frames: window.__concernFrames.size,
    feet: ['left', 'right'].map(side => {
      const foot = node.querySelector(`[data-foot="${side}"] ellipse`)
      const point = new DOMPoint(+foot.getAttribute('cx'), +foot.getAttribute('cy'))
        .matrixTransform(foot.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
      return { x: point.x, y: point.y }
    }),
  }
}

for (const { species, speed, peak, minimum, reversals, reduced = false } of [
  { species: 'mochi', speed: 9, peak: 1.8, minimum: 1.1, reversals: 1 },
  { species: 'bun', speed: 24, peak: 4.9, minimum: 3, reversals: 1 },
  { species: 'sprout', speed: 6.5, peak: 1.3, minimum: .8, reversals: 1 },
  { species: 'mochi', reduced: true },
]) test(`${species} reacts to an actually wilting plant${reduced ? ' without moving in reduced motion' : ' with a grounded deliberate appendage gesture'}`, async t => {
  const page = await browserApp(t, { reducedMotion: reduced ? 'reduce' : 'no-preference', viewport: { width: 1280, height: 800 } })
  await page.evaluate(species => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), load = store.get('snapshot')
      load.onsuccess = () => {
        const saved = load.result, pet = Object.values(saved.tables.pets)[0], room = Object.values(saved.tables.rooms)[0]
        // A first occurrence has one grace day. Three days back makes this
        // daily task two days late, producing actual condition-level2 wilt.
        const created = new Date(); created.setDate(created.getDate() - 3)
        const date = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
        pet.species = species
        pet.equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
        saved.tables.placed_objects = { 'concern-plant': { id: 'concern-plant', roomId: room.id, catalogId: 'plant', tileX: 5, tileY: 5, rotation: 0 } }
        saved.tables.chores = { 'concern-task': { id: 'concern-task', homeId: room.homeId, objectId: 'concern-plant', name: 'Water the plant', schedule: { kind: 'daily' }, createdOn: date, photoProof: false } }
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
    window.__concernFrames = new Set(); window.__concernTime = 0
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__concernFrames.delete(id); window.__concernTime = now; callback(now) })
      window.__concernFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__concernFrames.delete(id); cancel(id) }
  })
  await page.reload()
  const resident = page.locator('.room-pet'); await resident.waitFor()
  await page.getByText('2 days late', { exact: true }).waitFor()
  await page.getByText('Feeling happy', { exact: true }).waitFor()
  const saved = (await snapshot(page)).tables
  const initial = await resident.evaluate(read), body = await resident.locator('[data-character-body]').innerHTML()
  await resident.evaluate(node => { window.__concernPet = node })
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByRole('combobox', { name: /^Show / }).selectOption('concern-plant')
  await page.getByRole('button', { name: 'Look together', exact: true }).click()
  const live = page.locator('.living-room [aria-live="polite"]')
  const observations = ['The plant is drooping a little. Thirsty, maybe?', 'I heard a tiny leaf sigh.']
  if (reduced) {
    const heard = (await live.textContent()).trim()
    assert.ok(observations.includes(heard), 'wilting plant retains its existing condition observation')
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
    t.diagnostic('Visible reduced-motion wilting invitation: same position/body,existing3600ms speech lifetime,0resident frames,unchanged saved tables.')
    return
  }
  let heard = ''
  for (let i = 0; i < 150 && !heard; i++) { await page.clock.runFor(100); heard = (await live.textContent()).trim() }
  assert.ok(observations.includes(heard), 'the selected wilting furnishing must receive its invited observation')
  // Arrival polling overshoots by at most100ms. Sample after orientation and
  // its blend, before recovery can blend back to the next activity.
  await page.clock.runFor(360 + 120)
  const first = await resident.evaluate(read), samples = []
  for (let elapsed = 120; elapsed <= 1640; elapsed += 16) {
    const sample = await resident.evaluate(read)
    if (!samples.length || sample.time !== samples.at(-1).time) samples.push(sample)
    assert.equal(sample.frames, 1)
    assert.equal(sample.pose, 'idle', 'the fixture keeps the neutral appendage baseline')
    assert.equal(sample.position, first.position)
    for (let i = 0; i < 2; i++) assert.ok(Math.hypot(sample.feet[i].x - first.feet[i].x, sample.feet[i].y - first.feet[i].y) < .01, 'actual concern reaction feet stay planted')
    if (elapsed === 600 && process.env.CHORE_CONCERN_FOLLOW_CAPTURE_DIR) {
      await mkdir(process.env.CHORE_CONCERN_FOLLOW_CAPTURE_DIR, { recursive: true })
      await page.screenshot({ path: join(process.env.CHORE_CONCERN_FOLLOW_CAPTURE_DIR, `concern-follow-room-${species}.png`), fullPage: false })
    }
    await page.clock.runFor(16)
  }
  const angles = samples.map(sample => sample.angle), changes = samples.slice(1).map((sample, i) => ({ delta: sample.angle - angles[i], ms: sample.time - samples[i].time }))
  const observedSpeed = Math.max(...changes.map(({ delta, ms }) => Math.abs(delta) / ms * 1000)), observedPeak = Math.max(...angles.map(Math.abs))
  t.diagnostic(`Actual ${species} appendage peak${observedPeak.toFixed(3)}deg;speed${observedSpeed.toFixed(3)}deg/s`)
  assert.ok(observedSpeed < speed, 'the actual appendage must not flutter rapidly')
  assert.ok(observedPeak < peak)
  assert.ok(observedPeak > minimum, 'a wilting response must retain its recognizable appendage lift rather than a disabled still')
  const signs = angles.filter(angle => Math.abs(angle)>1e-5).map(Math.sign)
  assert.equal(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1]).length, reversals)
  assert.equal(await resident.evaluate(node => node === window.__concernPet), true)
  assert.equal((await live.textContent()).trim(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
  if(process.env.CHORE_CONCERN_FOLLOW_CAPTURE_DIR)await writeFile(join(process.env.CHORE_CONCERN_FOLLOW_CAPTURE_DIR,`concern-follow-room-${species}.json`),JSON.stringify({species,samples,observedSpeed,observedPeak,directionChanges:reversals,scope:'Actual dressed happy species appendage DOM transforms, native RAF timestamps, grounded local foot contacts, one clock and unchanged savedtables. Sprout angle is stem rotation, not full leaf angle. Native clock is deterministic/frozen.'},null,2)+'\n')
  t.diagnostic(`Chromium ${page.context().browser().version()}; ${samples.length} actual SVG appendage/timestamp samples; wilting linked chore; planted feet<.01localunits; one resident clock; unchanged position/node/announcement/saved tables`)
})
