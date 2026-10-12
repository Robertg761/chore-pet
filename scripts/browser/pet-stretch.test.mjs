import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

async function setup(t, species = 'mochi') {
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
    window.__stretchFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__stretchFrames.delete(id); callback(now) })
      window.__stretchFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__stretchFrames.delete(id); cancel(id) }
  })
  await page.reload()
  await page.locator('.room-pet').waitFor()
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  return page
}

const read = node => {
  const arm = side => Number(node.querySelector(`[data-arm="${side}"]`).getAttribute('transform').match(/rotate\(([^ ]+)/)[1])
  const feet = ['left', 'right'].map(side => {
    const ellipse = node.querySelector(`[data-foot="${side}"] ellipse`)
    const point = new DOMPoint(+ellipse.getAttribute('cx'), +ellipse.getAttribute('cy'))
      .matrixTransform(ellipse.getScreenCTM()).matrixTransform(node.getScreenCTM().inverse())
    return { x: point.x, y: point.y }
  })
  return { leftArm: arm('left'), rightArm: arm('right'), feet, body: node.querySelector('[data-character-body]').getAttribute('transform') }
}
function feetStay(a, b) {
  for (let i = 0; i < 2; i++) assert.ok(Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y) < .01, 'actual rendered foot contact must stay grounded')
}
for (const species of ['mochi', 'bun', 'sprout']) test(`${species} holds one grounded stretch on the resident clock`, async t => {
  const page = await setup(t, species), resident = page.locator('.room-pet')
  const choice = page.getByRole('button', { name: 'Stretch together', exact: true })
  assert.equal(await choice.count(), 1)
  const saved = (await snapshot(page)).tables, before = await resident.evaluate(read), position = await resident.getAttribute('transform')
  assert.equal(await resident.locator('[data-expression]').getAttribute('data-expression'), 'content')
  await resident.evaluate(node => { window.__stretchPet = node })
  await choice.click()
  const live = page.locator('.living-room [aria-live="polite"]'), heard = await live.textContent()
  assert.match(heard, /stretch/i)
  await page.clock.runFor(900)
  const peak = await resident.evaluate(read)
  assert.ok(Math.abs(peak.leftArm - { mochi: 46 * .82, bun: 58, sprout: 40 * .72 }[species] * .9) < 1e-8, 'sample home content energy retains the species-sized held arm')
  assert.equal(peak.rightArm, -peak.leftArm)
  assert.match(peak.body, /^translate\(0 0\)/)
  feetStay(before.feet, peak.feet)
  assert.equal(await resident.getAttribute('transform'), position)
  assert.equal(await resident.locator('[data-character-accents]').getAttribute('opacity'), '0')
  assert.equal(await page.evaluate(() => window.__stretchFrames.size), 1)
  for (let i = 0; i < 10; i++) await choice.click()
  assert.equal(await live.textContent(), heard)
  await page.clock.runFor(600)
  const held = await resident.evaluate(read)
  assert.equal(held.leftArm, peak.leftArm)
  feetStay(before.feet, held.feet)
  await page.clock.runFor(1000)
  assert.equal(await resident.locator('[data-expression-layer]').count(), 0)
  feetStay(before.feet, (await resident.evaluate(read)).feet)
  assert.equal(await resident.getAttribute('transform'), position)
  assert.equal(await resident.evaluate(node => node === window.__stretchPet), true)
  for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) assert.equal(await resident.locator(`[data-slot="${slot}"]`).count(), 1)
  assert.deepEqual((await snapshot(page)).tables, saved)
  await changeReducedMotion(page, 'reduce')
  await page.clock.runFor(120)
  assert.equal(await page.evaluate(() => window.__stretchFrames.size), 0)
  t.diagnostic(`Chromium ${page.context().browser().version()}; held arms;actual footcontacts<.01local SVGunits;oneclock;unchanged wardrobe/node/position/saved tables`)
})

test('live reduced motion keeps a chosen stretch still and releases its finite clock', async t => {
  const page = await setup(t), resident = page.locator('.room-pet')
  const choice = page.getByRole('button', { name: 'Stretch together', exact: true })
  assert.equal(await choice.count(), 1)
  await choice.click()
  await page.clock.runFor(128)
  await changeReducedMotion(page, 'reduce')
  assert.equal(await resident.locator('[data-expression="cheering"]').count(), 1)
  const still = await resident.locator('[data-character-body]').innerHTML()
  await page.clock.runFor(600)
  assert.equal(await resident.locator('[data-character-body]').innerHTML(), still)
  assert.equal(await page.evaluate(() => window.__stretchFrames.size), 1)
  await page.clock.runFor(2000)
  assert.equal(await page.evaluate(() => window.__stretchFrames.size), 0)
  assert.equal(await resident.locator('[data-expression-layer]').count(), 0)
})
