import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

const out = process.env.CHORE_DANCE_CAPTURE_DIR
const contacts = resident => resident.evaluate(node => [...node.querySelectorAll('[data-foot] ellipse')].map(foot => {
  const point = new DOMPoint(Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy'))).matrixTransform(foot.getScreenCTM())
  return { x: point.x, y: point.y }
}))
async function instrument(page, freeze) {
  if (freeze) { await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000) }
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__danceFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__danceFrames.delete(id); callback(now) })
      window.__danceFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__danceFrames.delete(id); cancel(id) }
  })
  await page.reload(); await page.locator('.room-pet').waitFor()
}

for (const species of ['mochi', 'bun', 'sprout']) test(`keyboard ${species} dance keeps both screen contacts and its original deadline`, async t => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' })
  await page.evaluate(species => new Promise((resolve, reject) => {
    const request = indexedDB.open('chore-pet', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('kv', 'readwrite'), store = tx.objectStore('kv'), read = store.get('snapshot')
      read.onsuccess = () => { const saved = read.result; Object.values(saved.tables.pets)[0].species = species; saved.outbox = {}; store.put(saved, 'snapshot') }
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), species)
  await instrument(page, true)
  const saved = (await snapshot(page)).tables, resident = page.locator('.room-pet')
  const art = await resident.locator('.ch-animated').elementHandle(), position = await resident.getAttribute('transform'), before = await contacts(resident)
  const idleArms = await resident.locator('[data-arm]').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')))
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  const rest = page.getByRole('button', { name: 'Rest together', exact: true }), dance = page.getByRole('button', { name: 'Dance together', exact: true })
  await rest.focus(); await page.keyboard.press('Tab')
  assert.equal(await dance.evaluate(node => node === document.activeElement && node.matches(':focus-visible')), true)
  await page.keyboard.press('Enter')
  const heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  assert.match(heard, /dance|sway|rhythm/i)
  const samples = []
  for (let elapsed = 200; elapsed <= 2600; elapsed += 200) {
    await page.clock.runFor(200)
    const feet = await contacts(resident), body = await resident.locator('[data-character-body]').getAttribute('transform')
    for (let i = 0; i < before.length; i++) assert.ok(Math.hypot(feet[i].x - before[i].x, feet[i].y - before[i].y) < .005, 'actual feet retain both screen-space ground contacts')
    assert.equal(await resident.getAttribute('transform'), position)
    assert.equal(await page.evaluate(() => window.__danceFrames.size), 1)
    assert.equal(await resident.locator('[data-character-accents]').getAttribute('opacity'), '0')
    samples.push({ elapsed, feet, body })
    if (elapsed === 1200) {
      await page.keyboard.press('Space')
      assert.match(await page.locator('.pet-play-feedback').textContent(), /busy/i)
      assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
      if (out) { await mkdir(out, { recursive: true }); await page.screenshot({ path: join(out, `dance-${species}.png`) }) }
    }
  }
  assert.ok(samples.some(sample => !sample.body.startsWith('translate(0 0)')), 'the normal-motion torso visibly sways')
  await page.clock.runFor(216)
  assert.deepEqual(await resident.locator('[data-arm]').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))), idleArms, 'busy retry cannot extend the2800ms deadline')
  assert.equal(await page.evaluate(() => window.__danceFrames.size), 1, 'normal idle retains the single resident clock')
  assert.equal(await resident.locator('.ch-animated').evaluate((node, old) => node === old, art), true)
  assert.deepEqual((await snapshot(page)).tables, saved)
  if (out) await writeFile(join(out, `dance-${species}.json`), JSON.stringify({ species, before, samples, heard, browser: page.context().browser().version(), method: 'Native Tab/Enter/Space, deterministic native clock,13sampled screen-space foot contacts, busy at1200, completion by2816. Unchanged savedtables and resident art identity.' }, null, 2) + '\n')
})

test('an enlarged-text offscreen dance stays still and expires without replay', { timeout: 15000 }, async t => {
  const page = await browserApp(t, { viewport: { width: 320, height: 640 } })
  await instrument(page, false)
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  const saved = (await snapshot(page)).tables, resident = page.locator('.room-pet'), idle = await resident.locator('.ch-animated').innerHTML(), idleBody = await resident.locator('[data-character-body]').getAttribute('transform')
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  const dance = page.getByRole('button', { name: 'Dance together', exact: true }), show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
  const scrollAway = async () => { await dance.scrollIntoViewIfNeeded(); await page.waitForFunction(() => document.querySelector('.room-pet').getBoundingClientRect().bottom < 0); await page.waitForFunction(() => window.__danceFrames.size === 0) }
  await scrollAway(); await dance.click()
  const heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  assert.match(heard, /dance|sway|rhythm/i)
  assert.equal(await page.evaluate(() => window.__danceFrames.size), 0)
  await show.focus(); await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__danceFrames.size === 1)
  assert.equal(await resident.locator('[data-expression]').getAttribute('data-expression'), 'cheering')
  assert.equal(await resident.locator('[data-character-body]').getAttribute('transform'), idleBody)
  await scrollAway(); await page.waitForTimeout(2900)
  assert.equal(await page.evaluate(() => window.__danceFrames.size), 0)
  await show.focus(); await page.keyboard.press('Enter')
  // Zero RAF already holds offscreen; await the asynchronous native observer's settled paint too.
  await page.waitForFunction(() => window.__danceFrames.size === 0 && document.querySelector('.room-pet [data-expression="content"]'))
  assert.equal(await resident.locator('.ch-animated').innerHTML(), idle)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
})
