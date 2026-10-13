import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, snapshot } from './helpers.mjs'

const contacts = resident => resident.evaluate(node => [...node.querySelectorAll('[data-foot] ellipse')].map(foot => {
  const point = new DOMPoint(Number(foot.getAttribute('cx')), Number(foot.getAttribute('cy'))).matrixTransform(foot.getScreenCTM())
  return { x: point.x, y: point.y }
}))

async function instrument(page, freeze) {
  if (freeze) { await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000) }
  await page.addInitScript(() => {
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__restFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__restFrames.delete(id); callback(now) })
      window.__restFrames.add(id); return id
    }
    window.cancelAnimationFrame = id => { window.__restFrames.delete(id); cancel(id) }
  })
  await page.reload(); await page.locator('.room-pet').waitFor()
}

test('a keyboard rest stays grounded and finishes at its original deadline after a busy retry', async t => {
  const page = await browserApp(t, { viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' })
  await instrument(page, true)
  const saved = (await snapshot(page)).tables
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  const rest = page.getByRole('button', { name: 'Rest together', exact: true })
  const resident = page.locator('.room-pet'), before = await contacts(resident)
  await rest.focus(); await page.keyboard.press('Enter')
  assert.equal(await rest.evaluate(node => node === document.activeElement && node.matches(':focus-visible')), true)
  const heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  assert.match(heard, /rest|quiet|slow/i)
  await page.clock.runFor(1200)
  const peak = await contacts(resident)
  for (let i = 0; i < before.length; i++) assert.ok(Math.hypot(peak[i].x - before[i].x, peak[i].y - before[i].y) < .005, 'both actual feet keep their screen-space ground contacts')
  assert.equal(await page.evaluate(() => window.__restFrames.size), 1)
  const angle = await resident.locator('[data-arm="left"]').getAttribute('transform')
  assert.ok(Number(angle.match(/rotate\(([^ ]+)/)[1]) < -9, 'the existing rest raises the hand softly at its held pose')
  const out = process.env.CHORE_REST_CAPTURE_DIR
  if (out) { await mkdir(out, { recursive: true }); await page.screenshot({ path: join(out, 'rest-held.png') }); await writeFile(join(out, 'rest-held.json'), JSON.stringify({ before, peak, leftArm: angle, pendingFrames: 1, scope: 'Actual screen-space contacts during normal-motion rest; deterministic paused native clock, unchanged savedtables.' }, null, 2) + '\n') }
  await page.keyboard.press('Enter')
  assert.match(await page.locator('.pet-play-feedback').textContent(), /busy/i)
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  await page.clock.runFor(1201)
  assert.match(await resident.locator('[data-arm="left"]').getAttribute('transform'), /^rotate\(0 /, 'busy retry does not extend2400ms deadline')
  assert.equal(await page.evaluate(() => window.__restFrames.size), 1, 'normal idle reuses the same single resident clock')
  assert.deepEqual((await snapshot(page)).tables, saved)
})

test('an enlarged-text offscreen rest is still, resumes only while active, and expires without replay', { timeout: 15000 }, async t => {
  const page = await browserApp(t, { viewport: { width: 320, height: 640 } })
  await instrument(page, false)
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  const saved = (await snapshot(page)).tables
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  const rest = page.getByRole('button', { name: 'Rest together', exact: true }), show = page.getByRole('button', { name: 'Show room with Mochi', exact: true })
  const scrollAway = async () => { await rest.scrollIntoViewIfNeeded(); await page.waitForFunction(() => document.querySelector('.room-pet').getBoundingClientRect().bottom < 0); await page.waitForFunction(() => window.__restFrames.size === 0) }
  await scrollAway(); await rest.click()
  const heard = await page.locator('.living-room [aria-live="polite"]').textContent()
  assert.match(heard, /rest|quiet|slow/i)
  assert.equal(await page.evaluate(() => window.__restFrames.size), 0)
  await show.focus(); await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__restFrames.size === 1)
  const resident = page.locator('.room-pet'), still = await resident.locator('.ch-animated').innerHTML()
  assert.equal(await resident.evaluate(node => node === document.activeElement), true)
  assert.equal(await resident.locator('[data-expression]').getAttribute('data-expression'), 'content')
  await scrollAway(); await page.waitForTimeout(2500)
  assert.equal(await page.evaluate(() => window.__restFrames.size), 0)
  await show.focus(); await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__restFrames.size === 0)
  assert.equal(await resident.locator('.ch-animated').innerHTML(), still, 'reduced rest retains the same still mood, including after expiry')
  assert.equal(await page.locator('.living-room [aria-live="polite"]').textContent(), heard)
  assert.deepEqual((await snapshot(page)).tables, saved)
  t.diagnostic('Real native observer/deadline at200%root text:0offscreen→1finitevisible→0offscreen/expired, no replay or saved changes.')
})
