import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserApp, changeReducedMotion, snapshot } from './helpers.mjs'

const out = process.env.CHORE_PET_THUMBNAIL_CAPTURE_DIR

async function creator(t, width, preference = 'normal') {
  const page = await browserApp(t, { viewport: { width, height: 800 }, reducedMotion: preference === 'system' ? 'reduce' : 'no-preference' })
  if (preference === 'device') {
    await page.evaluate(() => localStorage.setItem('chore-pet-reduce-motion', 'on'))
    await page.reload()
  }
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  return page
}

async function choosePart(page, name) {
  const tab = page.getByRole('tab', { name, exact: true })
  if (await tab.count()) await tab.click()
}

async function thumbnailState(page) {
  return page.evaluate(() => ({
    images: document.querySelectorAll('.cc-choice svg').length,
    infiniteAnimations: document.getAnimations().filter(animation => animation.effect?.target?.closest('.cc-choice') && animation.effect.getTiming().iterations === Infinity).map(animation => animation.animationName),
    groups: [...document.querySelectorAll('.cc-choice .ch-breathe, .cc-choice .ch-eye')].map(node => ({
      animation: getComputedStyle(node).animationName,
      transform: getComputedStyle(node).transform,
    })),
  }))
}

async function expectStill(page, expectedImages) {
  const state = await thumbnailState(page)
  if (expectedImages !== undefined) assert.equal(state.images, expectedImages)
  assert.deepEqual(state.infiniteAnimations, [], 'Comparison thumbnails must own no perpetual CSS animations')
  for (const group of state.groups) {
    assert.equal(group.animation, 'none')
    assert.equal(group.transform, 'none', 'Resting thumbnails keep their eyes open and body unscaled')
  }
  return state
}

async function capture(page, name, state) {
  if (!out) return
  await mkdir(out, { recursive: true })
  await page.screenshot({ path: join(out, `${name}.png`), animations: 'disabled' })
  await writeFile(join(out, `${name}.json`), JSON.stringify({ ...state, browser: page.context().browser().version(),
    method: 'Actual production CSS animation inventory and computed transforms asserted before screenshot. Screenshot settles finite UI transitions for still inspection; not a temporal or CPU/battery measurement.' }, null, 2) + '\n')
}

for (const width of [390, 1280]) for (const preference of ['normal', 'device', 'system']) {
  test(`comparison thumbnails stay still at ${width}px with ${preference} motion preference`, async t => {
    const page = await creator(t, width, preference)
    const before = (await snapshot(page)).tables
    for (const part of ['Who', 'Colour', 'Face']) {
      await choosePart(page, part)
      const state = await expectStill(page, width === 1280 ? 11 : { Who: 3, Colour: 0, Face: 8 }[part])
      if (part !== 'Colour') await capture(page, `thumbnail-${width}-${preference}-${part.toLowerCase()}`, { width, preference, part, ...state })
    }
    for (const name of ['Classic', 'Sparkly', 'Button', 'Lashes', 'Round', 'Hearts', 'Freckles', 'None']) {
      assert.equal(await page.getByRole('radio', { name, exact: true }).count(), 1)
    }
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    assert.deepEqual((await snapshot(page)).tables, before)
  })
}

async function trackFrames(page) {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1000)
  await page.evaluate(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame
    window.__thumbnailFrames = new Set()
    window.requestAnimationFrame = callback => {
      const id = request(time => { window.__thumbnailFrames.delete(id); callback(time) })
      window.__thumbnailFrames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { window.__thumbnailFrames.delete(id); cancel(id) }
  })
  await page.clock.runFor(48)
}
const frames = page => page.evaluate(() => window.__thumbnailFrames.size)

for (const width of [390, 1280]) {
  test(`still thumbnails preserve the finite main cheer at ${width}px`, async t => {
    const page = await creator(t, width)
    const before = (await snapshot(page)).tables
    await trackFrames(page)
    assert.equal(await frames(page), 0)
    await page.getByRole('radio', { name: 'Bun', exact: true }).click()
    await page.clock.runFor(756)
    assert.equal(await frames(page), 1, 'Only the finite main preview owns a pending JS frame')
    const art = page.locator('.cc-preview .ch-animated')
    assert.equal(await art.locator('[data-expression="cheering"]').count(), 1)
    assert.match(await art.locator('[data-character-body]').getAttribute('transform'), /^translate\(0 -/)
    await expectStill(page)
    const thumbnailArt = await page.locator('.cc-choice svg').evaluateAll(nodes => nodes.map(node => node.outerHTML))
    await page.clock.runFor(1200)
    assert.equal(await frames(page), 0)
    assert.equal(await art.locator('[data-expression="happy"]').count(), 1)
    await expectStill(page)
    assert.deepEqual(await page.locator('.cc-choice svg').evaluateAll(nodes => nodes.map(node => node.outerHTML)), thumbnailArt)
    await choosePart(page, 'Face')
    await page.getByRole('radio', { name: 'Sparkly', exact: true }).click()
    assert.equal(await frames(page), 0)
    await expectStill(page)
    assert.deepEqual((await snapshot(page)).tables, before)
    await page.clock.resume()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.waitForFunction(() => !document.documentElement.dataset.vt)
    await page.locator('.room-pet .ch-animated').waitFor()
    assert.deepEqual((await snapshot(page)).tables, before)
  })
}

test('live OS reduction changes and reopening never animate comparison thumbnails', async t => {
  const page = await creator(t, 390)
  await choosePart(page, 'Face')
  await expectStill(page, 8)
  await changeReducedMotion(page, 'reduce')
  await expectStill(page, 8)
  await changeReducedMotion(page, 'no-preference')
  await expectStill(page, 8)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Change look', exact: true }).click()
  await page.waitForFunction(() => !document.documentElement.dataset.vt)
  await expectStill(page, 3)
})
