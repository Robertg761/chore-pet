import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, snapshot } from './helpers.mjs'

for (const { species, selector, limit, factor } of [
  { species: 'mochi', selector: '[data-appendage="knot"] > g', limit: 2.25, factor: 1 },
  { species: 'bun', selector: '[data-appendage="left-ear"]', limit: 6.6, factor: 1 },
  { species: 'sprout', selector: '[data-appendage="stem"]', limit: 4.5, factor: .4 },
]) {
  test(`${species} settles into one gentle affection sway on the resident clock`, async t => {
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
      window.__affectionFrames = new Set()
      window.requestAnimationFrame = callback => {
        const id = request(now => { window.__affectionFrames.delete(id); callback(now) })
        window.__affectionFrames.add(id)
        return id
      }
      window.cancelAnimationFrame = id => { window.__affectionFrames.delete(id); cancel(id) }
    })
    await page.reload()
    const resident = page.locator('.room-pet')
    await resident.waitFor()
    const saved = (await snapshot(page)).tables
    await resident.evaluate(node => { window.__affectionPet = node })
    await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
    await page.getByRole('button', { name: 'Gentle pats', exact: true }).click()
    const position = await resident.getAttribute('transform')
    await page.clock.runFor(192)
    const angles = []
    for (let elapsed = 192; elapsed < 1600; elapsed += 32) {
      angles.push(await resident.evaluate((node, { selector, species, factor }) => {
        const part = node.querySelector(selector), matrix = part.transform.baseVal.consolidate().matrix
        const pose = node.querySelector('[data-character-pose]').dataset.characterPose
        const posture = species === 'mochi' ? pose === 'scruffy' ? 38 : ['meh', 'content'].includes(pose) ? 16 : 0 : 0
        return (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI - posture) / factor
      }, { selector, species, factor }))
      assert.equal(await page.evaluate(() => window.__affectionFrames.size), 1)
      assert.equal(await resident.getAttribute('transform'), position)
      await page.clock.runFor(32)
    }
    assert.ok(Math.max(...angles.map(Math.abs)) <= limit + 1e-6, 'actual appendage must stay inside gentle-angle budget')
    assert.ok(Math.max(...angles.map(Math.abs)) > .5, 'normal motion must visibly respond')
    const signs = angles.filter(angle => Math.abs(angle) > 1e-6).map(Math.sign)
    assert.equal(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1]).length, 1, 'actual appendage must make one relaxed sway')
    assert.equal(await resident.evaluate(node => node === window.__affectionPet), true)
    assert.deepEqual((await snapshot(page)).tables, saved)
    t.diagnostic(`Chromium ${page.context().browser().version()}; ${angles.length} actual SVG-angle samples; one resident clock; unchanged position/node/saved tables`)
  })
}
