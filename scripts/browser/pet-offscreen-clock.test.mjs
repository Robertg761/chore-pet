import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserApp } from './helpers.mjs'

async function motionPage(t, observation = true) {
  const page = await browserApp(t, { reducedMotion: 'no-preference', viewport: { width: 320, height: 640 } })
  await page.addInitScript(observation => {
    if (!observation) Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true })
    window.__offscreenIntersections = []
    const NativeObserver = window.IntersectionObserver
    if (NativeObserver) window.IntersectionObserver = class extends NativeObserver {
      constructor(callback, options) {
        super((entries, observer) => {
          for (const entry of entries) if (entry.target.matches('.room-pet')) {
            window.__offscreenIntersections.push({ inside: entry.isIntersecting, ratio: entry.intersectionRatio,
              bottom: entry.boundingClientRect.bottom, height: entry.intersectionRect.height })
          }
          callback(entries, observer)
        }, options)
      }
    }
    Math.random = () => .99
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__offscreenFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(now => { window.__offscreenFrames.delete(id); callback(now) })
      window.__offscreenFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__offscreenFrames.delete(id); cancel(id) }
  }, observation)
  await page.reload()
  return page
}

async function scrollAway(page) {
  const resident = page.locator('.room-pet')
  await resident.waitFor()
  await page.getByRole('button', { name: 'Explore together', exact: true }).click()
  await page.getByRole('button', { name: 'Spend time together', exact: true }).click()
  // The real Home scroll container, with both optional panels expanded.
  await page.mouse.move(300, 450)
  await page.mouse.wheel(0, 3000)
  await page.waitForFunction(() => document.querySelector('.room-pet').getBoundingClientRect().bottom < 0)
  const offscreen = await resident.boundingBox()
  assert.ok(offscreen.y + offscreen.height < 0, 'fixture must fully scroll the actual pet out of view')
  return { resident, offscreen }
}

test('a scrolled-away resident pauses, lets an offscreen response expire, and resumes when partly visible', async t => {
  const page = await motionPage(t)
  const { resident, offscreen } = await scrollAway(page)
  t.diagnostic(`Offscreen pending frames before pause:${await page.evaluate(() => window.__offscreenFrames.size)}`)
  await page.waitForFunction(() => window.__offscreenFrames.size === 0, null, { timeout: 2000 })
  assert.equal(await page.evaluate(() => window.__offscreenFrames.size), 0)
  await page.getByRole('button', { name: 'Gentle pats', exact: true }).click()
  assert.ok((await page.locator('.living-room [aria-live="polite"]').textContent()).trim())
  assert.equal(await page.evaluate(() => window.__offscreenFrames.size), 0)
  await page.waitForTimeout(1700)
  assert.equal(await page.evaluate(() => window.__offscreenFrames.size), 0)
  await page.mouse.move(300, 450)
  await page.mouse.wheel(0, offscreen.y + offscreen.height - 4)
  await page.waitForFunction(() => document.querySelector('.room-pet').getBoundingClientRect().bottom > 0)
  const partial = await resident.boundingBox()
  assert.ok(partial.y < 0 && partial.y + partial.height <= 10, 'fixture must expose only the bottom of the pet')
  await page.waitForFunction(() => window.__offscreenFrames.size === 1)
  assert.equal(await resident.locator('[data-expression="content"]').count(), 1, 'an expired response must restore the normal mood before returning')
  await resident.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => window.__offscreenFrames.size === 1)
  assert.equal(await page.evaluate(() => window.__offscreenFrames.size), 1)
  t.diagnostic(`Chromium ${page.context().browser().version()}; real native scroll;0offscreen/1visible pending resident frame`)
})

test('missing native observation retains the existing resident clock', async t => {
  const page = await motionPage(t, false)
  await scrollAway(page)
  assert.equal(await page.evaluate(() => typeof IntersectionObserver), 'undefined')
  assert.equal(await page.evaluate(() => window.__offscreenFrames.size), 1)
})

test('native default observer emits edge contact without a second positive-area entry', async t => {
  const page = await motionPage(t)
  // Isolate the native threshold contract with exact CSS-pixel bounds. SVG
  // observation includes renderer bounds beyond getBoundingClientRect, so the
  // production character is covered separately by real scroll/clipping cases.
  await page.evaluate(() => {
    const target = document.createElement('div')
    target.style.cssText = 'position:fixed;left:0;top:-20px;width:20px;height:20px;padding:0;border:0;'
    document.body.append(target)
    window.__nativeEdge = { target, entries: [] }
    window.__nativeEdge.observer = new IntersectionObserver(entries => {
      for (const entry of entries) window.__nativeEdge.entries.push({ inside: entry.isIntersecting, ratio: entry.intersectionRatio })
    })
    window.__nativeEdge.observer.observe(target)
  })
  await page.waitForFunction(() => window.__nativeEdge.entries.length > 0)
  assert.deepEqual(await page.evaluate(() => window.__nativeEdge.entries), [{ inside: true, ratio: 0 }])
  await page.evaluate(() => { window.__nativeEdge.target.style.top = '-12px' })
  await page.waitForTimeout(120)
  const result = await page.evaluate(() => ({ entries: window.__nativeEdge.entries, bottom: window.__nativeEdge.target.getBoundingClientRect().bottom }))
  assert.equal(result.bottom, 8)
  assert.equal(result.entries.length, 1, 'default thresholds do not promise a second callback at positive area')
  await page.evaluate(() => { window.__nativeEdge.observer.disconnect(); window.__nativeEdge.target.remove() })
  t.diagnostic('Native default threshold contract matches the hook notification-filtering regression.')
})

test('native ancestor clipping pauses a resident still inside the viewport', async t => {
  const page = await motionPage(t)
  await page.locator('.room-pet').waitFor()
  await page.waitForFunction(() => window.__offscreenFrames.size === 1)
  const original = await page.locator('.room-pet').boundingBox()
  assert.ok(original.y > 0 && original.y + original.height < 640)
  await page.evaluate(() => {
    window.__offscreenIntersections.length = 0
    const room = document.querySelector('.living-room')
    room.style.height = '1px'; room.style.overflow = 'hidden'
  })
  await page.waitForFunction(() => window.__offscreenIntersections.some(entry => !entry.inside), null, { timeout: 2000 })
  const clipped = await page.locator('.room-pet').boundingBox()
  assert.ok(clipped.y > 0 && clipped.y + clipped.height < 640, 'the SVG stays within the viewport while its ancestor clips it')
  await page.waitForFunction(() => window.__offscreenFrames.size === 0)
  t.diagnostic(`Native ancestor entries:${JSON.stringify(await page.evaluate(() => window.__offscreenIntersections))}`)
  await page.evaluate(() => { document.querySelector('.living-room').removeAttribute('style') })
  await page.waitForFunction(() => window.__offscreenFrames.size === 1)
})
