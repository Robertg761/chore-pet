import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion } from './helpers.mjs'

function recordScheduling() {
  window.__galleryScheduling = { intervals: 0, frames: 0 }
  const interval = window.setInterval.bind(window)
  const frame = window.requestAnimationFrame.bind(window)
  window.setInterval = (...args) => { window.__galleryScheduling.intervals++; return interval(...args) }
  window.requestAnimationFrame = (...args) => { window.__galleryScheduling.frames++; return frame(...args) }
}

async function galleryApp(t, reducedMotion = 'no-preference', viewport = { width: 390, height: 664 }, observation = true) {
  const page = await browserApp(t, { reducedMotion, viewport })
  await page.addInitScript(recordScheduling)
  if (!observation) await page.addInitScript(() => { window.IntersectionObserver = undefined })
  const url = new URL(page.url())
  url.search = '?art'
  await page.goto(url.href)
  await page.getByRole('heading', { name: 'Art gallery', exact: true }).waitFor()
  t.diagnostic(`Chromium ${page.context().browser().version()}; isolated offline production art gallery`)
  return page
}

async function css(locator) {
  return locator.evaluate((node) => ({ name: getComputedStyle(node).animationName, state: getComputedStyle(node).animationPlayState }))
}

async function assertCheerDeadline(page, deadline) {
  const ends = await page.locator('.gallery-effects .fx-cheer-pop').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node)
    return (Number.parseFloat(style.animationDelay) + Number.parseFloat(style.animationDuration)) * 1000
  }))
  assert.equal(ends.length, 36)
  assert.ok(ends.every((end) => Number.isFinite(end) && end >= 900 && end <= deadline + 0.1), `every accent must finish by cleanup at ${deadline}ms, latest=${Math.max(...ends)}ms`)
}

async function assertStillEffectCharacters(page) {
  const names = await page.locator('.gallery-effects .ch-breathe').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName))
  assert.equal(names.length, 3)
  assert.ok(names.every((name) => name === 'none'), `effect-preview characters must not animate ambiently: ${names.join(', ')}`)
}

for (const viewport of [{ width: 390, height: 664 }, { width: 1280, height: 800 }]) {
test(`gallery starts without repeating work and animates only visible rows at ${viewport.width}px`, { timeout: 20000 }, async (t) => {
  const page = await galleryApp(t, 'no-preference', viewport)
  assert.equal(await page.evaluate(() => window.__galleryScheduling.intervals), 0, 'the gallery must not start repeating effect timers')
  assert.equal(await page.evaluate(() => window.__galleryScheduling.frames), 0, 'a still gallery needs no application frame requests')
  await assertStillEffectCharacters(page)
  const examples = page.locator('.gallery-examples')
  assert.equal(await examples.getAttribute('data-examples-motion'), 'paused')
  assert.equal(await page.locator('.fx-cheer-hop,.fx-sparkle-star').count(), 0)
  const rows = examples.locator('.gallery-row:has(.ch-breathe)')
  const first = rows.first(), last = rows.last()
  assert.equal((await css(first.locator('.ch-breathe').first())).name, 'none')
  const toggle = page.getByRole('button', { name: 'Start example animations', exact: true })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await first.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('.gallery-examples .gallery-row:has(.ch-breathe)')?.dataset.galleryVisible === 'true', undefined, { polling: 50 })
  assert.equal((await css(first.locator('.ch-breathe').first())).state, 'running')
  assert.notEqual((await css(first.locator('.ch-breathe').first())).name, 'none')
  assert.equal((await css(last.locator('.ch-breathe').first())).state, 'paused')
  await last.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('.gallery-examples .gallery-row:has(.ch-breathe)')]
    return rows[0]?.dataset.galleryVisible === 'false' && rows.at(-1)?.dataset.galleryVisible === 'true'
  }, undefined, { polling: 50 })
  assert.equal((await css(first.locator('.ch-breathe').first())).state, 'paused')
  assert.equal((await css(last.locator('.ch-breathe').first())).state, 'running')
  const stop = page.getByRole('button', { name: 'Stop example animations', exact: true })
  await stop.click()
  assert.equal(await examples.getAttribute('data-examples-motion'), 'paused')
  assert.equal((await css(last.locator('.ch-breathe').first())).name, 'none')
  await assertStillEffectCharacters(page)
  assert.equal(await page.getByRole('button', { name: 'Start example animations', exact: true }).evaluate((node) => node === document.activeElement), true)
  const bounds = await page.getByRole('button', { name: 'Start example animations', exact: true }).boundingBox()
  assert.ok(bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, 'gallery animation control must fit the viewport')
  assert.equal(await page.evaluate(() => window.__galleryScheduling.frames), 0, 'CSS examples must not add an application frame clock')
  assert.equal(await page.evaluate(() => window.__galleryScheduling.intervals), 0)
  if (process.env.CHORE_PET_CAPTURE_DIR) {
    await mkdir(process.env.CHORE_PET_CAPTURE_DIR, { recursive: true })
    await page.locator('.gallery-motion-controls').evaluate((node) => node.scrollIntoView({ block: 'start' }))
    await page.screenshot({ path: join(process.env.CHORE_PET_CAPTURE_DIR, `gallery-${viewport.width}.png`) })
    await writeFile(join(process.env.CHORE_PET_CAPTURE_DIR, `gallery-${viewport.width}.json`), JSON.stringify({ viewport, bounds, scheduling: await page.evaluate(() => window.__galleryScheduling) }, null, 2) + '\n')
  }
})
}

test('gallery initial and live reduced motion stay authoritative without automatic replay', { timeout: 20000 }, async (t) => {
  const page = await galleryApp(t, 'reduce')
  const examples = page.locator('.gallery-examples')
  assert.equal(await page.getByRole('button', { name: 'Start example animations', exact: true }).isDisabled(), true)
  assert.equal(await examples.getAttribute('data-examples-motion'), 'paused')
  await changeReducedMotion(page, 'no-preference')
  await page.getByRole('button', { name: 'Start example animations', exact: true }).click()
  assert.equal(await examples.getAttribute('data-examples-motion'), 'running')
  await changeReducedMotion(page, 'reduce')
  assert.equal(await examples.getAttribute('data-examples-motion'), 'paused')
  assert.equal(await page.getByRole('button', { name: 'Start example animations', exact: true }).isDisabled(), true)
  await changeReducedMotion(page, 'no-preference')
  assert.equal(await examples.getAttribute('data-examples-motion'), 'paused')
  assert.equal(await page.getByRole('button', { name: 'Start example animations', exact: true }).isDisabled(), false)
  await assertStillEffectCharacters(page)
  await changeReducedMotion(page, 'reduce')
  await page.getByRole('button', { name: 'Replay cheers', exact: true }).click()
  await assertCheerDeadline(page, 1200)
  await changeReducedMotion(page, 'no-preference')
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop').count(), 0, 'restoring motion settles the active fade')
  await assertStillEffectCharacters(page)
  await page.getByRole('button', { name: 'Replay cheers', exact: true }).click()
  await assertCheerDeadline(page, 1750)
  await changeReducedMotion(page, 'reduce')
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop').count(), 0, 'reducing motion settles the active cheer')
})

test('gallery effects replay finitely with bounded nodes and no automatic restart', { timeout: 20000 }, async (t) => {
  const page = await galleryApp(t)
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.evaluate(recordScheduling)
  const sparkle = page.getByRole('button', { name: 'Replay sparkle', exact: true })
  const cheers = page.getByRole('button', { name: 'Replay cheers', exact: true })
  for (let i = 0; i < 5; i++) {
    await sparkle.click()
    await cheers.click()
  }
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop').count(), 3)
  assert.equal(await page.locator('.gallery-effects .fx-sparkle-ring').count(), 1)
  const cheerCss = await css(page.locator('.gallery-effects .fx-cheer-hop').first())
  assert.equal(cheerCss.name, 'fx-hop', 'manual effects must work while idle examples are stopped')
  assert.equal(cheerCss.state, 'running')
  await assertCheerDeadline(page, 1750)
  await page.clock.runFor(900)
  assert.equal(await page.locator('.gallery-effects .fx-sparkle-star').count(), 0)
  await page.clock.runFor(850)
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop').count(), 0)
  await page.clock.runFor(20000)
  assert.equal(await page.locator('.gallery-effects .fx-cheer-hop,.gallery-effects .fx-sparkle-star').count(), 0)
  await assertStillEffectCharacters(page)
  assert.equal(await page.evaluate(() => window.__galleryScheduling.intervals), 0)
  assert.equal(await page.locator('.gallery-examples').getAttribute('data-examples-motion'), 'paused')
})

test('gallery effects stay still when visibility observation is unavailable', { timeout: 20000 }, async (t) => {
  const page = await galleryApp(t, 'no-preference', undefined, false)
  assert.equal(await page.getByRole('button', { name: 'Start example animations', exact: true }).isDisabled(), true)
  assert.equal(await page.locator('.gallery-examples').getAttribute('data-examples-motion'), 'paused')
  await assertStillEffectCharacters(page)
  await page.getByRole('button', { name: 'Replay cheers', exact: true }).click()
  assert.equal((await css(page.locator('.gallery-effects .fx-cheer-hop').first())).name, 'fx-hop')
  await assertStillEffectCharacters(page)
})

test('sampled motion review plays independently while gallery examples remain still', { timeout: 20000 }, async (t) => {
  const page = await galleryApp(t)
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.evaluate(recordScheduling)
  const review = page.locator('.motion-review')
  await review.getByRole('button', { name: 'Play', exact: true }).click()
  // On a phone, the playback controls are above the actual preview row.
  await review.locator('.motion-review-previews').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('.motion-review').textContent.includes('Playing at'))
  await page.clock.runFor(128)
  assert.ok(Number(await review.getByLabel('Elapsed milliseconds', { exact: true }).inputValue()) > 0)
  assert.equal(await page.locator('.gallery-examples').getAttribute('data-examples-motion'), 'paused')
  assert.equal((await css(page.locator('.gallery-examples .ch-breathe').first())).name, 'none')
  await review.getByRole('button', { name: 'Pause', exact: true }).click()
  const requests = await page.evaluate(() => window.__galleryScheduling.frames)
  assert.ok(requests > 1)
  await page.clock.runFor(10000)
  assert.equal(await page.evaluate(() => window.__galleryScheduling.frames), requests)
  assert.equal(await page.evaluate(() => window.__galleryScheduling.intervals), 0)
})
