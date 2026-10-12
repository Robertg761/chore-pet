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
    window.__expressionFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__expressionFrames.delete(id); callback(now) })
      window.__expressionFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__expressionFrames.delete(id); cancel(id) }
  })
  await page.reload()
  await page.locator('.room-pet').waitFor()
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  return page
}

async function mix(resident) {
  const values = await resident.locator('[data-expression-layer]').evaluateAll(nodes => nodes.map(node => ({
    kind: node.dataset.expressionLayer, opacity: +node.getAttribute('opacity'),
    openEyes: node.querySelectorAll('[data-eye-gaze]').length,
    openings: [...node.querySelectorAll('[data-eye-open]')].map(eye => +eye.getAttribute('data-eye-open')),
  })))
  assert.equal(values.length, 2, 'the normal reaction must ease between its existing faces')
  const base = values.find(value => value.kind === 'mood'), pleased = values.find(value => value.kind === 'pleased')
  assert.equal(base.openEyes, 2)
  assert.equal(pleased.openEyes, 0)
  assert.ok(base.opacity > 0 && base.opacity < 1)
  assert.ok(pleased.opacity > 0 && pleased.opacity < 1)
  assert.ok(Math.abs(base.opacity + pleased.opacity - 1) < 1e-10)
  assert.equal(base.openings.length, 2)
  assert.ok(base.openings.every(opening => opening >= 0 && opening <= base.opacity + 1e-10), 'outgoing eyes close with the smile while retaining any current blink')
}

for (const species of ['mochi', 'bun', 'sprout']) {
  test(`${species} eases its actual pleased face at the start and return of pats`, async t => {
    const page = await setup(t, species), resident = page.locator('.room-pet')
    const saved = (await snapshot(page)).tables, position = await resident.getAttribute('transform')
    await resident.evaluate(node => { window.__expressionPet = node })
    await page.getByRole('button', { name: 'Gentle pats', exact: true }).click()
    await page.clock.runFor(128)
    await mix(resident)
    assert.equal(await page.evaluate(() => window.__expressionFrames.size), 1)
    await page.clock.runFor(672)
    assert.equal(await resident.locator('[data-expression-layer]').count(), 0, 'the full smile retains one face')
    assert.equal(await resident.locator('[data-expression="cheering"]').count(), 1)
    await page.clock.runFor(704)
    await mix(resident)
    await page.clock.runFor(200)
    assert.equal(await resident.locator('[data-expression-layer]').count(), 0, 'the settled mood retains one face')
    assert.equal(await resident.locator('[data-eye-gaze]').count(), 2)
    assert.equal(await resident.getAttribute('transform'), position)
    assert.equal(await resident.evaluate(node => node === window.__expressionPet), true)
    for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) assert.equal(await resident.locator(`[data-slot="${slot}"]`).count(), 1)
    assert.equal(await page.evaluate(() => window.__expressionFrames.size), 1, 'normal idle keeps only the existing resident loop')
    assert.deepEqual((await snapshot(page)).tables, saved)
    t.diagnostic(`Chromium ${page.context().browser().version()}; complementary eye layers only during easing; one clock; unchanged node/position/outfit/saved tables`)
  })
}

test('live reduced motion keeps the existing full reaction still and settles without extra face layers', async t => {
  const page = await setup(t), resident = page.locator('.room-pet')
  await page.getByRole('button', { name: 'Gentle pats', exact: true }).click()
  await page.clock.runFor(128)
  await mix(resident)
  await changeReducedMotion(page, 'reduce')
  assert.equal(await resident.locator('[data-expression-layer]').count(), 0)
  assert.equal(await resident.locator('[data-expression="cheering"]').count(), 1)
  const still = await resident.locator('[data-character-body]').innerHTML()
  await page.clock.runFor(600)
  assert.equal(await resident.locator('[data-character-body]').innerHTML(), still)
  await page.clock.runFor(1000)
  assert.equal(await page.evaluate(() => window.__expressionFrames.size), 0)
  assert.equal(await resident.locator('[data-expression-layer]').count(), 0)
})
