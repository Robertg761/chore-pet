import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp, changeReducedMotion, snapshot } from '../../../scripts/browser/helpers.mjs'

async function instrument(page) {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__playFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__playFrames.delete(id); window.__playFrameAt = now; callback(now) })
      window.__playFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__playFrames.delete(id); cancel(id) }
  })
  await page.reload()
}

function readPet(node) {
  const matrix = node.transform.baseVal.consolidate().matrix
  const body = node.querySelector('[data-character-body]').getCTM()
  return { at: performance.now(), frameAt: window.__playFrameAt,
    x: matrix.e, y: matrix.f,
    body: [[45, 40], [155, 40], [45, 182], [155, 182]].map(([x, y]) => {
      const point = new DOMPoint(x, y).matrixTransform(body)
      return { x: point.x, y: point.y }
    }) }
}

function readAccentMarks(node) {
  return [...node.querySelectorAll('[data-character-accents] path')].map(path => {
    const matrix = path.getCTM()
    return { x: matrix.e, y: matrix.f, scale: Math.hypot(matrix.a, matrix.b) }
  })
}

function assertAccentEmergence(early, peak) {
  assert.equal(early.length, 2)
  assert.equal(peak.length, 2)
  for (let i = 0; i < early.length; i++) {
    assert.ok(peak[i].scale > early[i].scale, 'each accent must emerge at its own anchor')
    assert.ok(peak[i].y < early[i].y, 'each accent must rise gently into its peak')
    assert.ok(Math.abs(peak[i].x - early[i].x) < .001, 'emergence must preserve horizontal placement')
  }
}

for (let trial = 0; trial < 6; trial++) {
test(`join diagnostic ${trial}`, async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference' })
  await instrument(page)
  const resident = page.locator('.room-pet')
  await resident.waitFor()
  const toggle = page.getByRole('button', { name: 'Spend time together', exact: true })
  assert.equal(await toggle.count(), 1)
  await toggle.click()
  await resident.evaluate(node => { window.__playPet = node })
  const saved = (await snapshot(page)).tables
  const start = await resident.evaluate(readPet)
  let before
  for (let i = 0; i < 100; i++) {
    await page.clock.runFor(32)
    const at = await resident.evaluate(readPet)
    if (Math.hypot(at.x - start.x, at.y - start.y) > 1) { before = at; break }
  }
  assert.ok(before, 'sample must start during a genuine walk')
  const pats = page.getByRole('button', { name: 'Gentle pats', exact: true })
  await pats.click()
  const after = await resident.evaluate(readPet)
  const subframe = Math.hypot(21.25, 10.625) / 420 * Math.max(0, after.at - before.frameAt)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) <= subframe + .01)
  const join = Math.max(...before.body.map((point, i) => Math.hypot(point.x - after.body[i].x, point.y - after.body[i].y)))
  t.diagnostic(JSON.stringify({ before, after, subframe, join }))
  assert.ok(join < .5, `chosen affection pose join:${join}roomSVGunits`)
  assert.equal(await resident.evaluate(node => node === window.__playPet), true)
  const live = page.locator('.living-room [aria-live="polite"]')
  const heard = await live.textContent()
  await page.clock.runFor(384)
  const earlyAccents = await resident.evaluate(readAccentMarks)
  await page.clock.runFor(216)
  assertAccentEmergence(earlyAccents, await resident.evaluate(readAccentMarks))
  const active = await resident.evaluate(readPet)
  for (let i = 0; i < 20; i++) await page.getByRole('button', { name: 'Wave', exact: true }).click()
  const busy = await resident.evaluate(readPet)
  assert.deepEqual(busy.body, active.body)
  assert.equal(await live.textContent(), heard)
  assert.match(await page.locator('.pet-play [role="status"]').textContent(), /moment/)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 1)
  await changeReducedMotion(page, 'reduce')
  await page.clock.runFor(1800)
  assert.equal(await page.evaluate(() => window.__playFrames.size), 0)
  await page.getByRole('button', { name: 'Wave', exact: true }).click()
  assert.equal(await page.locator('.pet-play [role="status"]').textContent(), '')
  assert.notEqual(await live.textContent(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic(`Chromium ${page.context().browser().version()}; join${join.toFixed(4)}roomSVGunits;20busychoices;oneframeclock;live reduction`)
})



}
