import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp } from './helpers.mjs'

async function reviewPage(t, observation = true) {
  const page = await browserApp(t, { reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } })
  await page.addInitScript(observation => {
    if (!observation) Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true })
  }, observation)
  const url = new URL(page.url()); url.search = '?art'
  await page.goto(url.href)
  const review = page.locator('.motion-review'), previews = review.locator('.motion-review-previews')
  // Let the lazy gallery commit before pausing timers used by Suspense.
  await review.getByRole('heading', { name: 'Deterministic motion review' }).waitFor()
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  // Install counters after Playwright replaces the page clock functions.
  await page.evaluate(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__visibleReviewFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__visibleReviewFrames.delete(id); callback(now) })
      window.__visibleReviewFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__visibleReviewFrames.delete(id); cancel(id) }
  })
  await review.getByRole('button', { name: 'Play', exact: true }).click()
  await previews.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => window.__visibleReviewFrames.size === 1)
  await page.clock.runFor(96)
  assert.ok(Number(await review.getByLabel('Elapsed milliseconds', { exact: true }).inputValue()) > 0)
  return { page, review, previews, time: review.getByLabel('Elapsed milliseconds', { exact: true }) }
}

async function scrollAway(page) {
  await page.mouse.move(1000, 100)
  await page.mouse.wheel(0, -100000)
  await page.waitForFunction(() => document.querySelector('.motion-review-previews').getBoundingClientRect().top > innerHeight)
}

test('native offscreen review playback pauses and resumes without counting the hidden interval', async t => {
  const { page, review, previews, time } = await reviewPage(t)
  await scrollAway(page)
  await page.waitForFunction(() => window.__visibleReviewFrames.size === 0, null, { timeout: 2000 })
  const paused = Number(await time.inputValue())
  assert.match(await review.textContent(), /Waiting for preview visibility/)
  await page.clock.runFor(10000)
  assert.equal(Number(await time.inputValue()), paused)
  assert.equal(await page.evaluate(() => window.__visibleReviewFrames.size), 0)
  await previews.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => window.__visibleReviewFrames.size === 1)
  await page.clock.runFor(16)
  const resumed = Number(await time.inputValue())
  assert.ok(resumed >= paused && resumed <= paused + 32, `review must resume near ${paused}ms,got${resumed}`)
  await page.clock.runFor(32)
  assert.ok(Number(await time.inputValue()) > resumed)
  await review.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__visibleReviewFrames.size), 0)
  t.diagnostic(`Chromium ${page.context().browser().version()};native scroll;0offscreen/1visible frame;10000ms gap excluded`)
})

test('unavailable native observation preserves explicit manual review playback', async t => {
  const { page, review, time } = await reviewPage(t, false)
  const before = Number(await time.inputValue())
  await scrollAway(page)
  assert.equal(await page.evaluate(() => window.__visibleReviewFrames.size), 1)
  await page.clock.runFor(64)
  assert.ok(Number(await time.inputValue()) > before)
  await review.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__visibleReviewFrames.size), 0)
})
